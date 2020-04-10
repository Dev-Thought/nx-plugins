import { BaseAdapter } from './base.adapter';
import { PROVIDER } from '../../../utils/provider';
import { prompt } from 'enquirer';
import { Rule, applyTemplates } from '@angular-devkit/schematics';
import { TargetDefinition } from '@angular-devkit/core/src/workspace';
import { join } from 'path';
import { JsonObject } from '@angular-devkit/core';
import { QUESTIONS } from '../../../utils/questions';

export class AngularUniversalAdapter extends BaseAdapter {
  async extendOptionsByUserInput() {
    await super.extendOptionsByUserInput();
    const questions: any[] = [];

    if (this.options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM) {
      if (!this.options.customDomainName)
        questions.push(QUESTIONS.customDomainName);
      if (!this.options['gcp:region'])
        questions.push(QUESTIONS.gcpRegionCloudFunctions);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...this.options,
      ...anwsers
    };
  }

  addRequiredDependencies() {
    const dependencies = super.addRequiredDependencies();

    if (
      this.options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM ||
      this.options.provider === PROVIDER.AWS
    ) {
      dependencies.push({ name: 'mime', version: '2.4.4' });
    }

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
          name: '@nestjs/azure-func-http',
          version: '^0.4.2'
        },
        {
          name: '@azure/functions',
          version: '^1.2.0'
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
}
