import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { Rule } from '@angular-devkit/schematics';
import { ApplicationType } from '../utils/application-type';
import { ArchitectOptions } from '../generators/init/architect-options';
import { join } from 'path';
import { PROVIDER } from '../utils/provider';
import { QUESTIONS } from '../utils/questions';
import { prompt } from 'enquirer';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NxDeployItBaseOptions } from './base.adapter.model';
import { NxDeployItInitSchematicSchema } from '../generators/init/schema';
import { NxDeployItDeployBuilderSchema } from '../executors/deploy/schema';
import { getDistributionPath, getPulumiBinaryPath } from '../utils/workspace';
import { DeployTargetOptions } from '../executors/deploy/target-options';
import { spawnSync } from 'child_process';

export class BaseAdapter {
  constructor(
    public project: ProjectDefinition,
    public options: NxDeployItBaseOptions,
    public applicationType: ApplicationType
  ) {}

  async extendOptionsByUserInput(): Promise<void> {
    const options = this.options as NxDeployItInitSchematicSchema;
    const questions: any[] = [];

    if (options.provider === PROVIDER.AWS) {
      if (!options['aws:region']) {
        questions.push(QUESTIONS.awsRegion);
      }
      if (!options['aws:profile']) {
        questions.push(QUESTIONS.awsProfile);
      }
    }

    if (options.provider === PROVIDER.AZURE && !options['azure:location']) {
      questions.push(QUESTIONS.azureLocation);
    }

    if (
      options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM &&
      !options['gcp:project']
    ) {
      questions.push(QUESTIONS.gcpProjectId);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...options,
      ...anwsers,
    };
  }

  addRequiredDependencies(): { name: string; version: string }[] {
    const dependencies: { name: string; version: string }[] = [];

    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    throw new Error('implement me');
  }

  getApplicationTemplatePath(): string {
    return `${this.options.provider}/`;
  }

  getDeployActionConfiguration(): any {
    const architectOptions: ArchitectOptions = {
      main: join(this.project.root, 'infrastructure', 'index.ts'),
      provider: this.options.provider,
    };

    const mergeOptions = { ...this.options };
    delete mergeOptions.project;
    delete mergeOptions.provider;

    return {
      builder: '@dev-thought/nx-deploy-it:deploy',
      options: {
        ...architectOptions,
        pulumi: mergeOptions,
      },
      configurations: {},
    };
  }

  getDestroyActionConfiguration(): any {
    const architectOptions: ArchitectOptions = {
      main: join(this.project.root, 'infrastructure', 'index.ts'),
      provider: this.options.provider,
    };

    return {
      builder: '@dev-thought/nx-deploy-it:destroy',
      options: {
        ...architectOptions,
      },
      configurations: {},
    };
  }

  deploy(
    context: BuilderContext,
    cwd: string,
    options: NxDeployItDeployBuilderSchema,
    configuration: string,
    targetOptions: any
  ): Observable<BuilderOutput> {
    const distributationPath = getDistributionPath(context);

    const build$: Observable<BuilderOutput> = from(
      context
        .scheduleTarget({
          target: 'build',
          project: context.target.project,
          configuration: context.target.configuration || '',
        })
        .then((target) => target.result)
    );

    return build$.pipe(
      switchMap(() =>
        this.up(
          cwd,
          options,
          configuration,
          targetOptions,
          distributationPath,
          context.target.project
        )
      )
    );
  }

  up(
    cwd: string,
    options: NxDeployItDeployBuilderSchema,
    configuration: string,
    targetOptions: DeployTargetOptions,
    distPath: string,
    projectName: string,
    additionArgs: string[] = []
  ) {
    const args = [
      'up',
      '--cwd',
      cwd,
      '--stack',
      `${configuration}-${projectName}`,
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

    args.push(...additionArgs);

    const up = spawnSync(getPulumiBinaryPath(), args, {
      env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' },
      stdio: 'inherit',
    });

    if (up.error) {
      return of({ success: false, error: up.error.message });
    }

    return of({ success: true });
  }

  getStackOutput(cwd: string, configuration: string, projectName: string) {
    const args = [
      'stack',
      'output',
      '--cwd',
      cwd,
      '--stack',
      `${configuration}-${projectName}`,
      '--json',
    ];

    const output = spawnSync(getPulumiBinaryPath(), args, {
      env: { ...process.env, PULUMI_SKIP_UPDATE_CHECK: '1' },
    });

    return JSON.parse(output.stdout.toString());
  }
}
