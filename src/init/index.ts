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
  template,
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
import { getCloudTemplateName, PROVIDER } from '../utils/provider';
import {
  getPulumiBinaryPath,
  hasAlreadyInfrastructureProject,
  getApplicationType
} from '../utils/workspace';
import { readFileSync, unlinkSync } from 'fs';
import * as rimraf from 'rimraf';
import { JsonObject } from '@angular-devkit/core';
import {
  ProjectDefinition,
  TargetDefinition
} from '@angular-devkit/core/src/workspace';

export default function(options: InitOptions) {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);

    if (project) {
      return chain([
        hasAlreadyInfrastructureProject(project),
        initializeCloudProviderApplication(project, options)
      ]);
    }

    context.logger.error(`Project doesn't exist`);
    return chain([]);
  };
}

function initializeCloudProviderApplication(
  project: ProjectDefinition,
  options: InitOptions
) {
  return chain([
    generateNewTempPulumiProject(project, options),
    generateInfrastructureCode(project, options),
    updateProject(project, options),
    cleanupTempPulumiProject(project)
  ]);
}

function generateNewTempPulumiProject(
  project: ProjectDefinition,
  options: InitOptions
): Rule {
  return (host: Tree): Rule => {
    let template = getCloudTemplateName(options.provider);

    spawnSync(
      getPulumiBinaryPath(),
      [
        'new',
        template,
        '--name',
        options.project,
        '--stack',
        'dev',
        '--dir',
        resolve(join(project.root, 'infrastructure')),
        '--description',
        'Infrastructure as Code based on Pulumi'
      ],
      { stdio: 'inherit' }
    );

    return addDependenciesFromPulumiProjectToPackageJson(project, options);
  };
}

function cleanupTempPulumiProject(project: ProjectDefinition) {
  return (host: Tree) => {
    unlinkSync(resolve(join(project.root, 'infrastructure'), '.gitignore'));
    unlinkSync(resolve(join(project.root, 'infrastructure'), 'index.ts'));
    unlinkSync(resolve(join(project.root, 'infrastructure'), 'tsconfig.json'));
    unlinkSync(resolve(join(project.root, 'infrastructure'), 'package.json'));
    unlinkSync(
      resolve(join(project.root, 'infrastructure'), 'package-lock.json')
    );
    rimraf.sync(resolve(join(project.root, 'infrastructure'), 'node_modules'));

    return host;
  };
}

function addDependenciesFromPulumiProjectToPackageJson(
  project: ProjectDefinition,
  options: InitOptions
): Rule {
  const pulumiCloudProviderDependencies = JSON.parse(
    readFileSync(
      resolve(join(project.root, 'infrastructure'), 'package.json')
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

function generateInfrastructureCode(
  project: ProjectDefinition,
  options: InitOptions
) {
  return (host: Tree, context: SchematicContext) => {
    const applicationType = getApplicationType(project);
    const buildTarget = project.targets.get('build') as TargetDefinition;
    const templateSource = apply(
      url(`./files/${options.provider}/${applicationType}`),
      [
        template({
          buildPath: join(
            `../../../${(buildTarget.options as JsonObject).outputPath}`
          ),
          projectName: options.project
        }),
        move(join(project.root, 'infrastructure'))
      ]
    );

    const rule = chain([branchAndMerge(chain([mergeWith(templateSource)]))]);
    return rule(host, context);
  };
}

export function updateProject(
  project: ProjectDefinition,
  options: InitOptions
): Rule {
  return async (host: Tree, _context: SchematicContext) => {
    const architectOptions = {
      main: join(project.root, 'infrastructure', 'index.ts'),
      provider: options.provider
    };
    return chain([
      updateJsonInTree(getWorkspacePath(host), json => {
        const project = json.projects[options.project];

        if (!project || !project.architect) {
          throw new SchematicsException(
            'An error has occured during modification of angular.json'
          );
        }
        project.architect['deploy'] = {
          builder: '@dev-thought/ng-deploy-universal:deploy',
          options: architectOptions,
          configurations: {
            production: {}
          }
        };
        return json;
      }),
      updateJsonInTree(getWorkspacePath(host), json => {
        const project = json.projects[options.project];

        if (!project || !project.architect) {
          throw new SchematicsException(
            'An error has occured during modification of angular.json'
          );
        }
        project.architect['destroy'] = {
          builder: '@dev-thought/ng-deploy-universal:destroy',
          options: architectOptions,
          configurations: {
            production: {}
          }
        };
        return json;
      }),
      // TODO: this is nx specific -> add angular compatibility
      updateJsonInTree(join(project.root, 'tsconfig.app.json'), json => {
        const exclude: string[] = json.exclude;
        const excludePaths = 'infrastructure/**/*.ts';

        if (!exclude) {
          json.exclude = [excludePaths];
        } else {
          exclude.push(excludePaths);
        }
        return json;
      })
    ]);
  };
}
