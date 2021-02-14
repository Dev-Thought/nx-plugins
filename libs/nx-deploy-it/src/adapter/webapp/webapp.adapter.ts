import { BaseAdapter } from '../base.adapter';
import { PROVIDER } from '../../utils/provider';
import { prompt } from 'enquirer';
import { Rule, applyTemplates } from '@angular-devkit/schematics';
import { TargetDefinition } from '@angular-devkit/core/src/workspace';
import { join } from 'path';
import { JsonObject } from '@angular-devkit/core';
import { QUESTIONS } from '../../utils/questions';
import { NxDeployItInitSchematicSchema } from '../../schematics/init/schema';

export class WebappAdapter extends BaseAdapter {
  async extendOptionsByUserInput() {
    const options = this.options as NxDeployItInitSchematicSchema;
    await super.extendOptionsByUserInput();
    const questions: any[] = [];

    if (
      options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM &&
      !options.customDomainName
    ) {
      questions.push(QUESTIONS.customDomainName);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...options,
      ...anwsers,
    };
  }

  addRequiredDependencies() {
    const dependencies = super.addRequiredDependencies();

    dependencies.push({ name: 'mime', version: '2.4.4' });

    if (this.options.provider === PROVIDER.AZURE) {
      dependencies.push({ name: '@azure/arm-cdn', version: '^4.2.0' });
    }
    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    const buildTarget = this.project.targets.get('build') as TargetDefinition;
    return applyTemplates({
      buildPath: join(
        `../../../${(buildTarget.options as JsonObject).outputPath}`
      ),
      projectName: this.options.project,
    });
  }

  getApplicationTemplatePath() {
    return `${super.getApplicationTemplatePath()}/webapp/`;
  }

  getDeployActionConfiguration(): any {
    const config = super.getDeployActionConfiguration();

    config.options.pulumi.useCdn = false;
    config.configurations = {
      production: { pulumi: { useCdn: true } },
    };
    return config;
  }

  getDestroyActionConfiguration(): any {
    const config = super.getDestroyActionConfiguration();
    return config;
  }
}
