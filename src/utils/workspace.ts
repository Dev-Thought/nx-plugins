import { resolve, join } from 'path';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { Observable } from 'rxjs';
import { getWorkspace } from '@nrwl/workspace';

export function getRealWorkspacePath() {
  // TODO!: get better way
  return process.cwd();
}

export function getPulumiBinaryPath() {
  return resolve(getRealWorkspacePath(), 'node_modules/.bin/pulumi');
}

export function hasAlreadyInfrastructureProject(projectName: string) {
  return (host: Tree, _context: SchematicContext) => {
    return new Observable<Tree>(observer => {
      getWorkspace(host)
        .then(workspace => {
          const project = workspace.projects.get(projectName);

          if (
            project &&
            host.exists(join(project.root, 'infrastructure', 'Pulumi.yaml'))
          ) {
            _context.logger.error(
              `The project ${projectName} already has an infrastructure setup`
            );
            observer.error('No project path found');
          } else {
            observer.next(host);
            observer.complete();
          }
        })
        .catch(function(err: any) {
          observer.error(err);
        });
    });
  };
}
