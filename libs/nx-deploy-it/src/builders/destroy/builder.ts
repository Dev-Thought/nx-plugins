import {
  BuilderContext,
  BuilderOutput,
  createBuilder
} from '@angular-devkit/architect';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NxDeployItDestroyBuilderSchema } from './schema';
import { spawnSync } from 'child_process';
import { getPulumiBinaryPath } from '../../utils/workspace';
import { DestroyTargetOptions } from './target-options';
import { dirname, resolve } from 'path';

function down(
  cwd: string,
  options: NxDeployItDestroyBuilderSchema,
  configuration: string,
  projectName: string
): Observable<BuilderOutput> {
  const args = [
    'destroy',
    '--cwd',
    cwd,
    '--stack',
    `${configuration}-${projectName}`
  ];
  if (options.nonInteractive) {
    args.push('--non-interactive', '--yes');
  }
  const up = spawnSync(getPulumiBinaryPath(), args, {
    env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' },
    stdio: 'inherit'
  });

  if (up.error) {
    return of({ success: false, error: up.error.message });
  }

  return of({ success: true });
}

export function runBuilder(
  options: NxDeployItDestroyBuilderSchema,
  context: BuilderContext
): Observable<BuilderOutput> {
  if (!context.target && !context.target.target) {
    return of({ success: false });
  }

  const configuration = context.target.configuration || 'dev';

  return from(context.getTargetOptions(context.target)).pipe(
    switchMap((targetOptions: DestroyTargetOptions) => {
      const cwd = dirname(
        resolve(context.workspaceRoot, targetOptions.main as string)
      );

      return down(cwd, options, configuration, context.target.project);
    })
  );
}

export default createBuilder(runBuilder);
