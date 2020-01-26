import { BuilderContext } from '@angular-devkit/architect';
import { DeployOptions } from '../options';
import { spawnSync, spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../../utils/workspace';
import { resolve, dirname } from 'path';

export async function deploy(context: BuilderContext, options: DeployOptions) {
  if (!options.noBuild) {
    context.logger.info('Build project');

    const build = await context.scheduleTarget({
      target: 'build',
      project: context!.target!.project,
      configuration: options.configuration
    });

    await build.result;

    context.logger.info('Build done');
  }

  if (context.target) {
    const targetOptions = await context.getTargetOptions(context.target);
    const indexTs = resolve(
      context.workspaceRoot,
      targetOptions.main as string
    );

    const result = spawnStack(dirname(indexTs), options.configuration);
    if (result.stderr && result.stderr.toString().includes('no stack named')) {
      spawnStack(dirname(indexTs), options.configuration, true);
    }

    return await new Promise((resolve, reject) => {
      const up = spawn(
        getPulumiBinaryPath(),
        ['up', '--cwd', dirname(indexTs), '--stack', options.configuration],
        {
          env: {
            ...process.env,
            PULUMI_CONFIG_PASSPHRASE: 'test',
            AWS_PROFILE: 'cli-dev-thought'
          }
        }
      );

      up.stdout.on('data', data => {
        console.log(data.toString());
      });

      up.stderr.on('data', data => {
        console.error(`up stderr: ${data.toString()}`);
      });

      up.on('close', code => {
        if (code !== 0) {
          console.log(`up process exited with code ${code}`);
          reject({ success: false });
        }
        resolve({ success: true });
      });
    });
  }

  return { success: false };
}

function spawnStack(cwd: string, configuration: string, withInit = false) {
  const args = ['stack', '--stack', configuration, '--cwd', cwd];
  if (withInit) {
    args.splice(1, 0, 'init');
  }

  return spawnSync(getPulumiBinaryPath(), args, {
    env: {
      ...process.env,
      // TODO: set environments
      PULUMI_CONFIG_PASSPHRASE: 'test',
      AWS_PROFILE: 'cli-dev-thought'
    }
  });
}
