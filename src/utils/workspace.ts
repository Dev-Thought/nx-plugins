import { resolve, join } from 'path';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import {
  ProjectDefinition,
  TargetDefinition
} from '@angular-devkit/core/src/workspace';

export function getRealWorkspacePath() {
  // TODO!: get better way
  return process.cwd();
}

export function getPulumiBinaryPath() {
  return resolve(getRealWorkspacePath(), 'node_modules/.bin/pulumi');
}

export function hasAlreadyInfrastructureProject(project: ProjectDefinition) {
  return (host: Tree, _context: SchematicContext) => {
    if (host.exists(join(project.root, 'infrastructure', 'Pulumi.yaml'))) {
      throw new Error('This project already has an infrastructure');
    } else {
      return host;
    }
  };
}

export function getApplicationType(target: TargetDefinition) {
  if (target && target.builder) {
    switch (target.builder) {
      case '@angular-devkit/build-angular:browser':
        return 'angular';
      case '@nrwl/node:build':
        return 'node';
    }
  }

  throw new Error(`Can't find a supported build target for the project`);
}
