import {
  BuilderContext,
  BuilderOutput,
  createBuilder
} from '@angular-devkit/architect';
import { Observable, Subject, from, of } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';
import { NxDeployItDeployBuilderSchema } from './schema';
import {
  getApplicationType,
  ApplicationType
} from '../../utils/application-type';
import { resolve, dirname } from 'path';
import * as ncc from '@zeit/ncc';
import { DeployTargetOptions } from './target-options';
import { spawnSync, spawn } from 'child_process';
import { getPulumiBinaryPath } from '../../utils/workspace';
import { readWorkspaceConfigPath } from '@nrwl/workspace';
import { ensureDirSync, ensureFileSync } from 'fs-extra';
import { writeFileSync } from 'fs';

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

function up(
  cwd: string,
  options: NxDeployItDeployBuilderSchema,
  configuration: string,
  targetOptions: DeployTargetOptions,
  distPath: string,
  projectName: string,
  context: BuilderContext
) {
  const subject = new Subject<{ success: boolean }>();
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

  if (targetOptions.pulumi) {
    for (const key in targetOptions.pulumi) {
      const value = targetOptions.pulumi[key];
      if (value) {
        args.push('-c', `${key}=${value}`);
      }
    }
  }
  args.push('-c', `distPath=${distPath}`);
  args.push('-c', `projectName=${projectName}`);
  const up = spawn(getPulumiBinaryPath(), args, {
    env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' },
    stdio: 'inherit'
  });

  up.on('close', code => {
    if (code !== 0) {
      context.logger.error(`up process exited with code ${code}`);
      subject.error({ success: false });
    } else {
      subject.next({ success: true });
    }
    subject.complete();
  });

  return subject.asObservable();
}

function getProjectConfig(context: BuilderContext) {
  const workspaceConfig = readWorkspaceConfigPath();

  return workspaceConfig.projects[context.target.project];
}

// TODO: Not sure if this is the best approach to get the outputPath
function getDistributionPath(context: BuilderContext) {
  const project = getProjectConfig(context);

  return resolve(
    context.workspaceRoot,
    project.architect.build.options.outputPath
  );
}

function buildProject(context: BuilderContext): Observable<BuilderOutput> {
  context.logger.info('Build project');

  const project = getProjectConfig(context);
  const applicationType = getApplicationType(project.architect.build);
  if (
    applicationType === ApplicationType.NESTJS ||
    applicationType === ApplicationType.EXPRESS
  ) {
    const infrastructureFolder = resolve(
      context.workspaceRoot,
      project.root,
      'infrastructure'
    );
    const processCwd = process.cwd();
    process.chdir(infrastructureFolder);
    return from(
      ncc(resolve(infrastructureFolder, 'functions/main/index.ts'), {
        cache: resolve(infrastructureFolder, 'buildcache')
      })
    ).pipe(
      map(
        (buildResult: {
          code: string;
          asset: { [index: string]: { source: string } };
        }) => {
          process.chdir(processCwd);
          ensureDirSync(resolve(infrastructureFolder, 'functions/dist/main'));
          // compiled javascript
          writeFileSync(
            resolve(infrastructureFolder, 'functions/dist/main/index.js'),
            buildResult.code
          );
          // assets
          for (const file in buildResult.asset) {
            const content = buildResult.asset[file];
            ensureFileSync(
              resolve(infrastructureFolder, `functions/dist/main/${file}`)
            );
            writeFileSync(
              resolve(infrastructureFolder, `functions/dist/main/${file}`),
              content.source.toString()
            );
          }
          return { success: true };
        }
      )
    );
  } else {
    return from(
      context.scheduleTarget({
        target: 'build',
        project: context.target.project,
        configuration: context.target.configuration || ''
      })
    ).pipe(switchMap(builderRun => from(builderRun.result)));
  }
}

export function runBuilder(
  options: NxDeployItDeployBuilderSchema,
  context: BuilderContext
): Observable<BuilderOutput> {
  const configuration = context.target.configuration || 'dev';

  return of({ success: true }).pipe(
    options.noBuild ? tap() : switchMap(() => buildProject(context)),
    switchMap(() =>
      from(context.getTargetOptions(context.target)).pipe(
        switchMap((targetOptions: DeployTargetOptions) => {
          const cwd = dirname(
            resolve(context.workspaceRoot, targetOptions.main as string)
          );

          createStackIfNotExist(cwd, configuration, context.target.project);

          const distributationPath = getDistributionPath(context);
          return up(
            cwd,
            options,
            configuration,
            targetOptions,
            distributationPath,
            context.target.project,
            context
          );
        })
      )
    )
  );
}

export default createBuilder(runBuilder);
