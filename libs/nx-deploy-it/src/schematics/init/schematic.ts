import { NxDeployItInitSchematicSchema } from './schema';
import {
  Rule,
  Tree,
  chain,
  noop,
  apply,
  url,
  mergeWith,
  move,
  SchematicContext,
  branchAndMerge
} from '@angular-devkit/schematics';
import {
  readJsonInTree,
  addDepsToPackageJson,
  getWorkspace,
  updateJsonInTree,
  updateWorkspace
} from '@nrwl/workspace';
import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { getCloudTemplateName } from '../../utils/provider';
import { getPulumiBinaryPath, getAdapter } from '../../utils/workspace';
import { readFileSync, unlinkSync } from 'fs';
import { BaseAdapter } from './adapter/base.adapter';

export function updateProject(adapter: BaseAdapter): Rule {
  return async () => {
    return chain([
      updateWorkspace(workspace => {
        const project = workspace.projects.get(adapter.options.project);
        project.targets.add({
          name: 'deploy',
          ...adapter.getDeployActionConfiguration()
        });
        project.targets.add({
          name: 'destroy',
          ...adapter.getDestroyActionConfiguration()
        });
      }),
      updateJsonInTree(
        join(adapter.project.root, 'tsconfig.app.json'),
        json => {
          const exclude: string[] = json.exclude;
          const excludePaths = 'infrastructure/**/*.ts';

          if (!exclude) {
            json.exclude = [excludePaths];
          } else {
            exclude.push(excludePaths);
          }
          return json;
        }
      )
    ]);
  };
}

function addDependenciesFromPulumiProjectToPackageJson(
  adapter: BaseAdapter
): Rule {
  return (host: Tree): Rule => {
    const pulumiCloudProviderDependencies = JSON.parse(
      host
        .read(join(adapter.project.root, 'infrastructure', 'package.json'))
        .toString()
    ).dependencies;
    const packageJson = readJsonInTree(host, 'package.json');
    const dependencyList: { name: string; version: string }[] = [];

    for (const name in pulumiCloudProviderDependencies) {
      const version = pulumiCloudProviderDependencies[name];
      if (version) {
        if (!packageJson.dependencies[name]) {
          dependencyList.push({
            name,
            version
          });
        }
      }
    }

    dependencyList.push(...adapter.addRequiredDependencies());

    if (!dependencyList.length) {
      return noop();
    }

    return addDepsToPackageJson(
      dependencyList.reduce((dictionary, value) => {
        dictionary[value.name] = value.version;
        return dictionary;
      }, {}),
      {}
    );
  };
}

function generateNewPulumiProject(adapter: BaseAdapter): Rule {
  return (): Rule => {
    const template = getCloudTemplateName(adapter.options.provider);
    const args = [
      'new',
      template,
      '--name',
      adapter.options.project,
      '--dir',
      resolve(join(adapter.project.root, 'infrastructure')),
      '--description',
      'Infrastructure as Code based on Pulumi - managed by @dev-thought/nx-deploy-it',
      '--generate-only'
    ];

    spawnSync(getPulumiBinaryPath(), args, {
      env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' }
    });

    return addDependenciesFromPulumiProjectToPackageJson(adapter);
  };
}

function mergePulumiProjectIntoTree(adapter: BaseAdapter) {
  return (host: Tree) => {
    const infraDir = join(adapter.project.root, 'infrastructure');

    const PulumiFile = join(infraDir, 'Pulumi.yaml');
    host.create(PulumiFile, readFileSync(PulumiFile));

    return host;
  };
}

function cleanupTempPulumiProject(adapter: BaseAdapter) {
  return (host: Tree) => {
    const infraDir = join(adapter.project.root, 'infrastructure');
    unlinkSync(resolve(infraDir, 'Pulumi.yaml'));
    unlinkSync(resolve(infraDir, '.gitignore'));
    unlinkSync(resolve(infraDir, 'index.ts'));
    unlinkSync(resolve(infraDir, 'tsconfig.json'));
    unlinkSync(resolve(infraDir, 'package.json'));

    return host;
  };
}

function generateInfrastructureCode(adapter: BaseAdapter) {
  return (host: Tree, context: SchematicContext) => {
    const template = adapter.getApplicationTypeTemplate();
    if (!template) {
      throw new Error(`Can't find a supported build target for the project`);
    }
    const templateSource = apply(
      url(`./files/${adapter.getApplicationTemplatePath()}`),
      [template, move(join(adapter.project.root))]
    );

    const rule = chain([branchAndMerge(chain([mergeWith(templateSource)]))]);
    return rule(host, context);
  };
}

function initializeCloudProviderApplication(adapter: BaseAdapter) {
  return chain([
    generateNewPulumiProject(adapter),
    mergePulumiProjectIntoTree(adapter),
    cleanupTempPulumiProject(adapter),
    generateInfrastructureCode(adapter),
    updateProject(adapter)
  ]);
}

export default function(options: NxDeployItInitSchematicSchema) {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (!project) {
      context.logger.error(`Project doesn't exist`);
      return chain([]);
    }

    if (project.targets.has('deploy')) {
      context.logger.error(
        `Your project is already configured with a deploy job`
      );
      return chain([]);
    }

    if (host.exists(join(project.root, 'infrastructure', 'Pulumi.yaml'))) {
      context.logger.error(`This project already has an infrastructure`);
      return chain([]);
    }

    const adapter = getAdapter(project, options, host);
    await adapter.extendOptionsByUserInput();

    return chain([initializeCloudProviderApplication(adapter)]);
  };
}
