import { resolve } from 'path';
import {
  ProjectDefinition,
  WorkspaceDefinition
} from '@angular-devkit/core/src/workspace';
import { BaseAdapter } from '../schematics/init/adapter/base.adapter';
import { getApplicationType, ApplicationType } from './application-type';
import { NxDeployItInitSchematicSchema } from '../schematics/init/schema';
import { WebappAdapter } from '../schematics/init/adapter/webapp.adapter';
import { NestJSAdapter } from '../schematics/init/adapter/nestjs.adapter';

export function getRealWorkspacePath() {
  // TODO!: find a better way
  return process.cwd();
}

export function getPulumiBinaryPath() {
  return resolve(getRealWorkspacePath(), 'node_modules/.bin/pulumi');
}

export function getAdapter(
  project: ProjectDefinition,
  options: NxDeployItInitSchematicSchema
): BaseAdapter {
  const applicationType = getApplicationType(project.targets.get('build'));
  switch (applicationType) {
    case ApplicationType.ANGULAR:
    case ApplicationType.REACT:
      return new WebappAdapter(project, options, applicationType);
    case ApplicationType.NESTJS:
      return new NestJSAdapter(project, options, applicationType);
    default:
  }

  throw new Error(
    `Can't recognize application type. Supported list can be found here: https://github.com/Dev-Thought/nx-plugins/libs/nx-deploy-it`
  );
}

export function getApplications(
  workspace: WorkspaceDefinition
): { projectName: string; applicationType: ApplicationType }[] {
  const applications: {
    projectName: string;
    applicationType: ApplicationType;
  }[] = [];
  workspace.projects.forEach((project, projectName) => {
    const applicationType = getApplicationType(project.targets.get('build'));
    if (applicationType) {
      applications.push({
        projectName,
        applicationType
      });
    }
  });

  return applications;
}
