import { BuilderContext } from '@angular-devkit/architect';
import { DeployOptions } from '../options';
import { spawnSync, spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../../utils/workspace';
import { resolve, dirname } from 'path';
import { DeployTargetOptions } from './target-options';
import { readWorkspaceConfigPath } from '@nrwl/workspace';

export async function deploy(context: BuilderContext, options: DeployOptions) {
  const configuration = context!.target!.configuration || 'dev';
  if (!options.noBuild) {
    context.logger.info('Build project');

    const build = await context.scheduleTarget({
      target: 'build',
      project: context!.target!.project,
      configuration: context!.target!.configuration || ''
    });

    await build.result;

    context.logger.info('Build done');
  }

  if (context.target) {
    const targetOptions = (await context.getTargetOptions(
      context.target
    )) as DeployTargetOptions;
    const cwd = dirname(
      resolve(context.workspaceRoot, targetOptions.main as string)
    );

    createStackIfNotExist(cwd, configuration);

    const distributationPath = await getDistributionPath(context);
    return up(
      cwd,
      options,
      configuration,
      targetOptions.useCdn,
      distributationPath,
      context.target.project
    );
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

async function up(
  cwd: string,
  options: DeployOptions,
  configuration: string,
  useCdn: boolean = false,
  distPath: string,
  projectName: string
) {
  return await new Promise((resolve, reject) => {
    const args = ['up', '--cwd', cwd, '--stack', configuration];
    if (options.nonInteractive) {
      args.push('--non-interactive', '--yes');
    }
    args.push('-c', `useCdn=${useCdn}`);
    args.push('-c', `distPath=${distPath}`);
    args.push('-c', `projectName=${projectName}`);
    const up = spawn(getPulumiBinaryPath(), args, {
      env: process.env,
      stdio: 'inherit'
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

// TODO: Not sure if this is the best approach to get the outputPath
async function getDistributionPath(context: BuilderContext) {
  const workspaceConfig = readWorkspaceConfigPath();

  return resolve(
    context.workspaceRoot,
    workspaceConfig.projects[context.target!.project].architect.build.options
      .outputPath
  );
}
