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
import { prompt } from 'enquirer';
import { ArchitectOptions } from './architect-options';

export default function(options: InitOptions) {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(options.project);
    const applicationType = getApplicationType(project!.targets.get('build')!);

    // TODO: extract into abstract class
    // google cloud provider
    if (options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM) {
      if (!options.customDomainName && applicationType === 'angular') {
        const result = await prompt<{ customDomainName: string }>({
          type: 'input',
          name: 'customDomainName',
          message:
            'GCP requires a customDomainName which needs to be set up by you. Find more in the documentation.',
          initial: 'www.example.com'
        });
        options.customDomainName = result.customDomainName;
      }
      if (applicationType === 'node') {
        const result = await prompt<{ region: string }>({
          type: 'input',
          name: 'region',
          message: 'Where do you want to deploy your google cloud function.',
          initial: 'us-west1'
        });
        options.region = result.region;
      }
    }

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
    const args = [
      'new',
      template,
      '--name',
      options.project,
      '--stack',
      `dev-${options.project}`,
      '--dir',
      resolve(join(project.root, 'infrastructure')),
      '--description',
      'Infrastructure as Code based on Pulumi'
    ];

    // TODO: extract into abstract class
    if (options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM && options.region) {
      args.push('-c', `gcp:region=${options.region}`);
    }

    spawnSync(getPulumiBinaryPath(), args, { stdio: 'inherit' });

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
    const target = project.targets.get('build')!;
    const applicationType = getApplicationType(target);

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

    // TODO: extract into abstract class
    if (
      options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM ||
      options.provider === PROVIDER.AWS
    ) {
      dependencyList.push({ name: 'mime', version: '2.4.4' });
    }

    if (options.provider === PROVIDER.AZURE) {
      dependencyList.push({ name: '@azure/arm-cdn', version: '^4.2.0' });
      /**
       * TODO: currently we just support nestjs but if we want to support more we need to differenciate between
       * different types of node applications
       */
      switch (applicationType) {
        case 'node':
          dependencyList.push(
            {
              name: '@nestjs/azure-func-http',
              version: '^0.4.2'
            },
            {
              name: '@azure/functions',
              version: '^1.2.0'
            }
          );
          break;

        default:
          break;
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
    const target = project.targets.get('build')!;
    const applicationType = getApplicationType(target);
    const templateSource = apply(
      url(`./files/${options.provider}/${applicationType}`),
      [getApplicationTypeTemplate(project, options), move(join(project.root))]
    );

    const rule = chain([branchAndMerge(chain([mergeWith(templateSource)]))]);
    return rule(host, context);
  };
}

function getApplicationTypeTemplate(
  project: ProjectDefinition,
  options: InitOptions
) {
  const target = project.targets.get('build');
  if (target) {
    switch (target.builder) {
      case '@angular-devkit/build-angular:browser':
        const buildTarget = project.targets.get('build') as TargetDefinition;
        return template({
          buildPath: join(
            `../../../${(buildTarget.options as JsonObject).outputPath}`
          ),
          projectName: options.project
        });
        break;
      case '@nrwl/node:build':
        return template({
          rootDir: 'src',
          getRootDirectory: () => 'src',
          stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
          getRootModuleName: () => 'AppModule',
          getRootModulePath: () => 'app/app.module',
          projectName: options.project
        });
    }
  }

  // TODO: List supported build targets in documentation
  throw new Error(`Can't find a supported build target for the project`);
}

export function updateProject(
  project: ProjectDefinition,
  options: InitOptions
): Rule {
  return async (host: Tree, _context: SchematicContext) => {
    const architectOptions: ArchitectOptions = {
      main: join(project.root, 'infrastructure', 'index.ts'),
      provider: options.provider,
      useCdn: false
    };
    if (options.customDomainName) {
      architectOptions.customDomainName = options.customDomainName;
    }
    return chain([
      updateJsonInTree(getWorkspacePath(host), json => {
        const project = json.projects[options.project];

        if (!project || !project.architect) {
          throw new SchematicsException(
            'An error has occured during modification of angular.json'
          );
        }
        project.architect['deploy'] = {
          builder: '@dev-thought/ng-deploy-it:deploy',
          options: architectOptions,
          configurations: {
            production: {
              useCdn: true
            }
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
          builder: '@dev-thought/ng-deploy-it:destroy',
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
