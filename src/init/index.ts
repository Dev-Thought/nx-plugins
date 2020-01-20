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
  SchematicContext
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
import { Observable } from 'rxjs';
import * as rimraf from 'rimraf';

export default function(options: InitOptions): Rule {
  return chain([
    hasAlreadyInfrastructureProject(options.project),
    initializeCloudProviderApplication(options)
  ]);
}

function initializeCloudProviderApplication(options: InitOptions): Rule {
  return chain([
    generateNewTempPulumiProject(options.provider),
    copyTempPulumiProjectToTree(options.project),
    cleanupTempPulumiProject()
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

function copyTempPulumiProjectToTree(projectName: string): Rule {
  return (host: Tree, _context: SchematicContext) => {
    return new Observable<Tree>(observer => {
      getWorkspace(host)
        .then(workspace => {
          const project = workspace.projects.get(projectName);

          if (project) {
            const pulumyConfig = readFileSync(
              resolve(getRealWorkspacePath(), '.tmp-iac/Pulumi.yaml')
            );

            host.create(
              join(project.root, 'infrastructure', 'Pulumi.yaml'),
              pulumyConfig
            );

            observer.next(host);
            observer.complete();
          } else {
            observer.error('No project path found');
          }
        })
        .catch(function(err: any) {
          observer.error(err);
        });
    });
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
