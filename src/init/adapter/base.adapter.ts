import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { Rule } from '@angular-devkit/schematics';
import { InitOptions } from '../schema';
import { ApplicationType } from '../../utils/application-type';
import { ArchitectOptions } from '../architect-options';
import { join } from 'path';
import { PROVIDER } from '../../utils/provider';

export class BaseAdapter {
  constructor(
    public project: ProjectDefinition,
    public options: InitOptions,
    public applicationType: ApplicationType
  ) {}

  async extendOptionsByUserInput(): Promise<void> {
    throw new Error('implement me');
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
      builder: '@dev-thought/ng-deploy-it:deploy',
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
      builder: '@dev-thought/ng-deploy-it:destroy',
      options: {
        ...architectOptions
      },
      configurations: {}
    };
  }
}
