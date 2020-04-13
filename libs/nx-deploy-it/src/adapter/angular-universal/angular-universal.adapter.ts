import { BaseAdapter } from '../base.adapter';
import { PROVIDER } from '../../utils/provider';
import { prompt } from 'enquirer';
import { Rule, applyTemplates } from '@angular-devkit/schematics';
import { TargetDefinition } from '@angular-devkit/core/src/workspace';
import { join, resolve } from 'path';
import { JsonObject } from '@angular-devkit/core';
import { QUESTIONS } from '../../utils/questions';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { NxDeployItInitSchematicSchema } from '../../schematics/init/schema';
import { getDistributionPath, getProjectConfig } from '../../utils/workspace';
import { NxDeployItDeployBuilderSchema } from '../../builders/deploy/schema';
import { ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE } from './deployment-type.enum';

export class AngularUniversalAdapter extends BaseAdapter {
  async extendOptionsByUserInput() {
    await super.extendOptionsByUserInput();
    const options = this.options as NxDeployItInitSchematicSchema;
    const questions: any[] = [];

    questions.push(QUESTIONS.angularUniversal);

    if (options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM) {
      if (!options.customDomainName) questions.push(QUESTIONS.customDomainName);
      if (!options['gcp:region'])
        questions.push(QUESTIONS.gcpRegionCloudFunctions);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...options,
      ...anwsers
    };
  }

  addRequiredDependencies() {
    const dependencies = super.addRequiredDependencies();

    dependencies.push({ name: 'mime', version: '2.4.4' });

    if (this.options.provider === PROVIDER.AWS) {
      dependencies.push({
        name: 'aws-serverless-express',
        version: '^3.3.6'
      });
    }

    if (this.options.provider === PROVIDER.AZURE) {
      dependencies.push(
        { name: '@azure/arm-cdn', version: '^4.2.0' },
        {
          name: 'azure-aws-serverless-express',
          version: '^0.1.5'
        }
      );
    }

    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    const buildTarget = this.project.targets.get('build') as TargetDefinition;
    return applyTemplates({
      getRootDirectory: () => '',
      buildPath: join(
        `../../../${(buildTarget.options as JsonObject).outputPath}`
      ),
      projectName: this.options.project
    });
  }

  getApplicationTemplatePath() {
    return `${super.getApplicationTemplatePath()}/angular-universal/`;
  }

  getDeployActionConfiguration(): any {
    const config = super.getDeployActionConfiguration();

    config.options.pulumi.useCdn = false;
    config.configurations = {
      production: { pulumi: { useCdn: true } }
    };
    return config;
  }

  getDestroyActionConfiguration(): any {
    const config = super.getDestroyActionConfiguration();
    return config;
  }

  deploy(
    context: BuilderContext,
    cwd: string,
    options: NxDeployItDeployBuilderSchema,
    configuration: string,
    targetOptions: any
  ): Observable<BuilderOutput> {
    const distributationPath = getDistributionPath(context);
    const project = getProjectConfig(context);
    const infrastructureFolder = resolve(
      context.workspaceRoot,
      project.root,
      'infrastructure'
    );
    const deploymentType: ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE =
      targetOptions.pulumi.angularUniversalDeploymentType;

    let baseHref = '/';
    switch (this.options.provider) {
      case PROVIDER.AWS:
        baseHref = `/${context.target.configuration || 'dev'}/`;
        break;

      default:
        break;
    }

    switch (deploymentType) {
      case ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE.PRERENDERING:
        return from(
          context
            .scheduleTarget({
              target: 'prerender',
              project: context.target.project,
              configuration: context.target.configuration || undefined
            })
            .then(build => build.result)
        ).pipe(
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

      case ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE.SERVER_SIDE_RENDERING:
        return from(
          Promise.all([
            context.scheduleTarget(
              {
                target: 'build',
                project: context.target.project,
                configuration: context.target.configuration || undefined
              },
              {
                baseHref
              }
            ),
            context.scheduleTarget(
              {
                target: 'server',
                project: context.target.project,
                configuration: context.target.configuration || undefined
              },
              {
                main: resolve(infrastructureFolder, 'functions/main/index.ts'),
                tsConfig: resolve(infrastructureFolder, 'tsconfig.json')
              }
            )
          ]).then(([build, server]) =>
            Promise.all([build.result, server.result])
          )
        ).pipe(
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

      default:
        throw new Error(
          'Unknown deployment type! Supported types are: ["prerendering", "ssr"]'
        );
    }
  }
}
