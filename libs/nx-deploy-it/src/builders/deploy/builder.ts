import {
  BuilderContext,
  BuilderOutput,
  createBuilder
} from '@angular-devkit/architect';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NxDeployItDeployBuilderSchema } from './schema';
import { getApplicationType } from '../../utils/application-type';
import { resolve, dirname } from 'path';
import { DeployTargetOptions } from './target-options';
import { spawnSync } from 'child_process';
import {
  getPulumiBinaryPath,
  getProjectConfig,
  getAdapterByApplicationType
} from '../../utils/workspace';

function spawnStack(
  cwd: string,
  configuration: string,
  projectName: string,
  withInit = false
) {
  const args = [
    'stack',
    '--stack',
    `${configuration}-${projectName}`,
    '--cwd',
    cwd
  ];
  if (withInit) {
    args.splice(1, 0, 'init');
  }

  return spawnSync(getPulumiBinaryPath(), args, {
    env: process.env
  });
}

function createStackIfNotExist(
  cwd: string,
  configuration: string,
  projectName: string
) {
  const result = spawnStack(cwd, configuration, projectName);
  if (result.stderr && result.stderr.toString().includes('no stack named')) {
    spawnStack(cwd, configuration, projectName, true);
  }
}

export function runBuilder(
  options: NxDeployItDeployBuilderSchema,
  context: BuilderContext
): Observable<BuilderOutput> {
  if (!context?.target?.project) {
    return of({ success: false });
  }
  const configuration = context.target.configuration || 'dev';

  const project = getProjectConfig(context);
  const applicationType = getApplicationType(project.architect);

  return from(context.getTargetOptions(context.target)).pipe(
    switchMap((targetOptions: DeployTargetOptions) => {
      const cwd = dirname(
        resolve(context.workspaceRoot, targetOptions.main as string)
      );

      createStackIfNotExist(cwd, configuration, context.target.project);

      const adapter = getAdapterByApplicationType(
        applicationType,
        project,
        options
      );

      return adapter.deploy(
        context,
        cwd,
        options,
        configuration,
        targetOptions
      );
    })
  );
}

export default createBuilder(runBuilder);
