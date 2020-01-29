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
    const cwd = dirname(
      resolve(context.workspaceRoot, targetOptions.main as string)
    );

    createStackIfNotExist(cwd, options.configuration);

    return up(cwd, options.configuration);
  }

  return { success: false };
}

function spawnStack(cwd: string, configuration: string, withInit = false) {
  const args = ['stack', '--stack', configuration, '--cwd', cwd];
  if (withInit) {
    args.splice(1, 0, 'init');
  }

  return spawnSync(getPulumiBinaryPath(), args, {
    env: process.env,
    stdio: 'inherit'
  });
}

function createStackIfNotExist(cwd: string, configuration: string) {
  const result = spawnStack(cwd, configuration);
  if (result.stderr && result.stderr.toString().includes('no stack named')) {
    spawnStack(cwd, configuration, true);
  }
}

async function up(cwd: string, configuration: string) {
  return await new Promise((resolve, reject) => {
    console.log('before up');
    const up = spawn(
      getPulumiBinaryPath(),
      ['up', '--cwd', cwd, '--stack', configuration],
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
