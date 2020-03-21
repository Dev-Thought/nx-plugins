import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { Rule } from '@angular-devkit/schematics';
import { NxDeployItInitSchematicSchema } from '../schema';
import { ApplicationType } from '../../../utils/application-type';
import { ArchitectOptions } from '../architect-options';
import { join } from 'path';
import { PROVIDER } from '../../../utils/provider';
import { QUESTIONS } from '../../../utils/questions';
import { prompt } from 'enquirer';

export class BaseAdapter {
  constructor(
    public project: ProjectDefinition,
    public options: NxDeployItInitSchematicSchema,
    public applicationType: ApplicationType
  ) {}

  async extendOptionsByUserInput(): Promise<void> {
    const questions: any[] = [];

    if (this.options.provider === PROVIDER.AWS) {
      if (!this.options['aws:region']) {
        questions.push(QUESTIONS.awsRegion);
      }
      if (!this.options['aws:profile']) {
        questions.push(QUESTIONS.awsProfile);
      }
    }

    if (
      this.options.provider === PROVIDER.AZURE &&
      !this.options['azure:location']
    ) {
      questions.push(QUESTIONS.azureLocation);
    }

    if (
      this.options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM &&
      !this.options['gcp:project']
    ) {
      questions.push(QUESTIONS.gcpProjectId);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...this.options,
      ...anwsers
    };
  }

  addRequiredDependencies(): { name: string; version: string }[] {
    const dependencies: { name: string; version: string }[] = [];

    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    throw new Error('implement me');
  }

  getDeployActionConfiguration(): any {
    const architectOptions: ArchitectOptions = {
      main: join(this.project.root, 'infrastructure', 'index.ts'),
      provider: this.options.provider
    };

    const mergeOptions = { ...this.options };
    delete mergeOptions.project;
    delete mergeOptions.provider;

    return {
      builder: '@dev-thought/nx-deploy-it:deploy',
      options: {
        ...architectOptions,
        pulumi: mergeOptions
      },
      configurations: {}
    };
  }

  getDestroyActionConfiguration(): any {
    const architectOptions: ArchitectOptions = {
      main: join(this.project.root, 'infrastructure', 'index.ts'),
      provider: this.options.provider
    };

    return {
      builder: '@dev-thought/nx-deploy-it:destroy',
      options: {
        ...architectOptions
      },
      configurations: {}
    };
  }
}
