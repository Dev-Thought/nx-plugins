import { resolve, join } from 'path';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';

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
      _context.logger.error(
        `The project ${project} already has an infrastructure setup`
      );
      _context.logger.error('No project path found');
    } else {
      return host;
    }
  };
}
