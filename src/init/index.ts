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
  template
} from '@angular-devkit/schematics';
import {
  readJsonInTree,
  addDepsToPackageJson,
  getWorkspace
} from '@nrwl/workspace';
import { spawnSync } from 'child_process';
import { resolve, join } from 'path';
import { getCloudTemplateName } from '../utils/provider';
import {
  getPulumiBinaryPath,
  getRealWorkspacePath,
  hasAlreadyInfrastructureProject
} from '../utils/workspace';
import { readFileSync } from 'fs';
import * as rimraf from 'rimraf';
import { strings } from '@angular-devkit/core';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';

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
    generateNewTempPulumiProject(options.provider),
    copyTempPulumiProjectToTree(project),
    cleanupTempPulumiProject(),
    generateInfrastructureCode(project, options)
  ]);
}

function generateNewTempPulumiProject(provider: string): Rule {
  return (host: Tree): Rule => {
    let template = getCloudTemplateName(provider);

    spawnSync(getPulumiBinaryPath(), [
      'new',
      template,
      '--name',
      'iac',
      '--dir',
      '.tmp-iac',
      '--description',
      'Infrastructure as Code based on Pulumi',
      '--generate-only',
      '--force'
    ]);
    return addDependenciesFromPulumiProjectToPackageJson();
  };
}

function copyTempPulumiProjectToTree(project: ProjectDefinition): Rule {
  return (host: Tree, _context: SchematicContext) => {
    const pulumyConfig = readFileSync(
      resolve(getRealWorkspacePath(), '.tmp-iac/Pulumi.yaml')
    );

    host.create(
      join(project.root, 'infrastructure', 'Pulumi.yaml'),
      pulumyConfig
    );

    return host;
  };
}

function cleanupTempPulumiProject() {
  return (host: Tree) => {
    rimraf.sync(resolve(getRealWorkspacePath(), '.tmp-iac'));

    return host;
  };
}

function addDependenciesFromPulumiProjectToPackageJson(): Rule {
  const pulumiCloudProviderDependencies = JSON.parse(
    readFileSync(
      resolve(getRealWorkspacePath(), '.tmp-iac/package.json')
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
    // TODO: make aws/angular dynamic -> provder + application type
    const templateSource = apply(url('./files/aws/angular'), [
      move(join(project.root, 'infrastructure'))
    ]);

    const rule = chain([branchAndMerge(chain([mergeWith(templateSource)]))]);
    return rule(host, context);
  };
}
