import {
  BuilderContext,
  BuilderOutput,
  createBuilder
} from '@angular-devkit/architect';
import { Observable, from, Subject, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NxDeployItDestroyBuilderSchema } from './schema';
import { spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../utils/workspace';
import { DestroyTargetOptions } from './target-options';
import { dirname, resolve } from 'path';

function down(
  cwd: string,
  options: NxDeployItDestroyBuilderSchema,
  configuration: string,
  projectName: string
) {
  const subject = new Subject<{ success: boolean }>();
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
  const up = spawn(getPulumiBinaryPath(), args, {
    env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' },
    stdio: 'inherit'
  });

  up.on('close', code => {
    if (code !== 0) {
      console.log(`up process exited with code ${code}`);
      subject.error({ success: false });
    }
    subject.next({ success: true });
    subject.complete();
  });

  return subject.asObservable();
}

export function runBuilder(
  options: NxDeployItDestroyBuilderSchema,
  context: BuilderContext
): Observable<BuilderOutput> {
  if (!context.target) {
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
