import { InitOptions } from './schema';
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
  branchAndMerge,
  SchematicsException
} from '@angular-devkit/schematics';
import {
  readJsonInTree,
  addDepsToPackageJson,
  getWorkspace,
  updateJsonInTree,
  getWorkspacePath
} from '@nrwl/workspace';
import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { getCloudTemplateName } from '../utils/provider';
import { getPulumiBinaryPath, getAdapter } from '../utils/workspace';
import { readFileSync, unlinkSync } from 'fs';
import { BaseAdapter } from './adapter/base.adapter';

export default function(options: InitOptions) {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (!project) {
      context.logger.error(`Project doesn't exist`);
      return chain([]);
    }

    if (host.exists(join(project.root, 'infrastructure', 'Pulumi.yaml'))) {
      context.logger.error(`This project already has an infrastructure`);
      return chain([]);
    }

    const adapter = getAdapter(project, options);
    await adapter.extendOptionsByUserInput();

    return chain([initializeCloudProviderApplication(adapter)]);
  };
}

function initializeCloudProviderApplication(adapter: BaseAdapter) {
  return chain([
    generateNewPulumiProject(adapter),
    generateInfrastructureCode(adapter),
    updateProject(adapter),
    cleanupTempPulumiProject(adapter)
  ]);
}

function generateNewPulumiProject(adapter: BaseAdapter): Rule {
  return (host: Tree): Rule => {
    let template = getCloudTemplateName(adapter.options.provider);
    const args = [
      'new',
      template,
      '--name',
      adapter.options.project,
      '--dir',
      resolve(join(adapter.project.root, 'infrastructure')),
      '--description',
      'Infrastructure as Code based on Pulumi',
      '--generate-only'
    ];

    spawnSync(getPulumiBinaryPath(), args);
    return addDependenciesFromPulumiProjectToPackageJson(adapter);
  };
}

function cleanupTempPulumiProject(adapter: BaseAdapter) {
  return (host: Tree) => {
    const infraDir = join(adapter.project.root, 'infrastructure');
    unlinkSync(resolve(infraDir, '.gitignore'));
    unlinkSync(resolve(infraDir, 'index.ts'));
    unlinkSync(resolve(infraDir, 'tsconfig.json'));
    unlinkSync(resolve(infraDir, 'package.json'));

    return host;
  };
}

function addDependenciesFromPulumiProjectToPackageJson(
  adapter: BaseAdapter
): Rule {
  const pulumiCloudProviderDependencies = JSON.parse(
    readFileSync(
      resolve(join(adapter.project.root, 'infrastructure'), 'package.json')
    ).toString()
  ).dependencies;

  return (host: Tree): Rule => {
    const packageJson = readJsonInTree(host, 'package.json');
    const dependencyList: { name: string; version: string }[] = [];

    for (const name in pulumiCloudProviderDependencies) {
      if (pulumiCloudProviderDependencies.hasOwnProperty(name)) {
        const version = pulumiCloudProviderDependencies[name];
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

function generateInfrastructureCode(adapter: BaseAdapter) {
  return (host: Tree, context: SchematicContext) => {
    const template = adapter.getApplicationTypeTemplate();
    if (!template) {
      throw new Error(`Can't find a supported build target for the project`);
    }
    const templateSource = apply(
      url(`./files/${adapter.options.provider}/${adapter.applicationType}`),
      [adapter.getApplicationTypeTemplate(), move(join(adapter.project.root))]
    );

    const rule = chain([branchAndMerge(chain([mergeWith(templateSource)]))]);
    return rule(host, context);
  };
}

export function updateProject(adapter: BaseAdapter): Rule {
  return async (host: Tree, _context: SchematicContext) => {
    return chain([
      updateJsonInTree(getWorkspacePath(host), json => {
        const project = json.projects[adapter.options.project];

        if (!project || !project.architect) {
          throw new SchematicsException(
            'An error has occured during modification of angular.json'
          );
        }
        project.architect.deploy = adapter.getDeployActionConfiguration();
        project.architect.destroy = adapter.getDestroyActionConfiguration();
        return json;
      }),

      // TODO: this is nx angular specific -> add angular and nx native compatibility
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
