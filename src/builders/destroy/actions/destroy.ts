import { BuilderContext } from '@angular-devkit/architect';
import { DestroyOptions } from '../options';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../../utils/workspace';

export async function destroy(
  context: BuilderContext,
  options: DestroyOptions
) {
  if (context.target) {
    const targetOptions = await context.getTargetOptions(context.target);
    const cwd = dirname(
      resolve(context.workspaceRoot, targetOptions.main as string)
    );

    return down(cwd, options);
  }

  return { success: false };
}

async function down(cwd: string, options: DestroyOptions) {
  return await new Promise((resolve, reject) => {
    const args = ['destroy', '--cwd', cwd, '--stack', options.configuration];
    if (options.nonInteractive) {
      args.push('--non-interactive', '--yes');
    }
    const up = spawn(
      getPulumiBinaryPath(),
      args,
      {
        env: process.env,
        stdio: 'inherit'
      }
    );

    up.on('close', code => {
      if (code !== 0) {
        console.log(`up process exited with code ${code}`);
        reject({ success: false });
      }
      resolve({ success: true });
    });
  });
}
