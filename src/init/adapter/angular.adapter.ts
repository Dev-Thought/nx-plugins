import { BaseAdapter } from './base.adapter';
import { PROVIDER } from '../../utils/provider';
import { prompt } from 'enquirer';
import { Rule, template } from '@angular-devkit/schematics';
import { TargetDefinition } from '@angular-devkit/core/src/workspace';
import { join } from 'path';
import { JsonObject } from '@angular-devkit/core';
import { QUESTIONS } from '../../utils/questions';

export class AngularAdapter extends BaseAdapter {
  async extendOptionsByUserInput() {
    const questions: any[] = [];

    if (
      this.options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM &&
      !this.options.customDomainName
    ) {
      questions.push(QUESTIONS.customDomainName);
    }

    if (this.options.provider === PROVIDER.AWS) {
      questions.push(QUESTIONS.awsRegion);
      questions.push(QUESTIONS.awsProfile);
    }

    if (this.options.provider === PROVIDER.AZURE) {
      questions.push(QUESTIONS.azureLocation);
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

    if (this.options.provider === PROVIDER.AZURE) {
      dependencies.push({ name: '@azure/arm-cdn', version: '^4.2.0' });
    }
    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    const buildTarget = this.project.targets.get('build') as TargetDefinition;
    return template({
      buildPath: join(
        `../../../${(buildTarget.options as JsonObject).outputPath}`
      ),
      projectName: this.options.project
    });
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
