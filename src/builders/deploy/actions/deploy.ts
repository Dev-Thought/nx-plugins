import { BuilderContext } from '@angular-devkit/architect';
import { DeployOptions } from '../options';
import { spawnSync, spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../../utils/workspace';
import { resolve, dirname } from 'path';
import { DeployTargetOptions } from './target-options';
import { readWorkspaceConfigPath } from '@nrwl/workspace';
import * as ncc from '@zeit/ncc';
import { writeFileSync } from 'fs';
import { ensureDirSync, ensureFileSync } from 'fs-extra';
import {
  getApplicationType,
  ApplicationType
} from '../../../utils/application-type';

export async function deploy(context: BuilderContext, options: DeployOptions) {
  const configuration = context!.target!.configuration || 'dev';
  if (!options.noBuild) {
    context.logger.info('Build project');

    const project = await getProjectConfig(context);
    const applicationType = getApplicationType(project.architect.build);
    if (applicationType === ApplicationType.NESTJS) {
      const infrastructureFolder = resolve(
        context.workspaceRoot,
        project.root,
        'infrastructure'
      );
      const processCwd = process.cwd();
      process.chdir(infrastructureFolder);
      const { code, map, assets } = await ncc(
        resolve(infrastructureFolder, 'functions/main/index.ts'),
        {
          cache: resolve(infrastructureFolder, 'buildcache')
        }
      );
      process.chdir(processCwd);
      ensureDirSync(resolve(infrastructureFolder, 'functions/dist/main'));
      // compiled javascript
      writeFileSync(
        resolve(infrastructureFolder, 'functions/dist/main/index.js'),
        code
      );
      // assets
      for (const file in assets) {
        const content = assets[file];
        ensureFileSync(
          resolve(infrastructureFolder, `functions/dist/main/${file}`)
        );
        writeFileSync(
          resolve(infrastructureFolder, `functions/dist/main/${file}`),
          content.source.toString()
        );
      }
    } else {
      const build = await context.scheduleTarget({
        target: 'build',
        project: context!.target!.project,
        configuration: context!.target!.configuration || ''
      });

      await build.result;
    }

    context.logger.info('Build done');
  }

  if (context.target) {
    const targetOptions = (await context.getTargetOptions(
      context.target
    )) as DeployTargetOptions;
    const cwd = dirname(
      resolve(context.workspaceRoot, targetOptions.main as string)
    );

    createStackIfNotExist(cwd, configuration, context.target.project);

    const distributationPath = await getDistributionPath(context);
    return up(
      cwd,
      options,
      configuration,
      targetOptions.useCdn,
      distributationPath,
      context.target.project,
      targetOptions.customDomainName
    );
  }

  return { success: false };
}

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
    env: process.env,
    stdio: 'inherit'
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

async function up(
  cwd: string,
  options: DeployOptions,
  configuration: string,
  useCdn: boolean = false,
  distPath: string,
  projectName: string,
  customDomainName: string
) {
  return await new Promise((resolve, reject) => {
    const args = [
      'up',
      '--cwd',
      cwd,
      '--stack',
      `${configuration}-${projectName}`
    ];
    if (options.nonInteractive) {
      args.push('--non-interactive', '--yes');
    }
    if (customDomainName) {
      args.push('-c', `customDomainName=${customDomainName}`);
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

async function getProjectConfig(context: BuilderContext) {
  const workspaceConfig = readWorkspaceConfigPath();

  return workspaceConfig.projects[context.target!.project];
}

// TODO: Not sure if this is the best approach to get the outputPath
async function getDistributionPath(context: BuilderContext) {
  const project = await getProjectConfig(context);

  return resolve(
    context.workspaceRoot,
    project.architect.build.options.outputPath
  );
}
