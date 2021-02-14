import { resolve } from 'path';
import {
  ProjectDefinition,
  WorkspaceDefinition,
} from '@angular-devkit/core/src/workspace';
import { BaseAdapter } from '../adapter/base.adapter';
import { getApplicationType, ApplicationType } from './application-type';
import { NxDeployItInitSchematicSchema } from '../generators/init/schema';
import { WebappAdapter } from '../adapter/webapp/webapp.adapter';
import { NestJSAdapter } from '../adapter/nestjs/nestjs.adapter';
import { ExpressAdapter } from '../adapter/express/express.adapter';
import { Tree } from '@angular-devkit/schematics';
import { AngularUniversalAdapter } from '../adapter/angular-universal/angular-universal.adapter';
import { BuilderContext } from '@angular-devkit/architect';
import { readWorkspaceConfig } from '@nrwl/workspace';

export function getRealWorkspacePath() {
  // TODO!: find a better way
  return process.cwd();
}

export function getPulumiBinaryPath() {
  return resolve(getRealWorkspacePath(), 'node_modules/.bin/pulumi');
}

export function getAdapterByApplicationType(
  applicationType: ApplicationType,
  project: ProjectDefinition,
  options: NxDeployItInitSchematicSchema
): BaseAdapter {
  switch (applicationType) {
    case ApplicationType.ANGULAR:
    case ApplicationType.REACT:
      return new WebappAdapter(project, options, applicationType);
    case ApplicationType.NESTJS:
      return new NestJSAdapter(project, options, applicationType);
    case ApplicationType.EXPRESS:
      return new ExpressAdapter(project, options, applicationType);
    case ApplicationType.ANGULAR_UNIVERSAL:
      return new AngularUniversalAdapter(project, options, applicationType);
    default:
  }

  throw new Error(
    `Can't recognize application type. Supported list can be found here: https://github.com/Dev-Thought/nx-plugins/libs/nx-deploy-it`
  );
}

export function getAdapter(
  project: ProjectDefinition,
  options: NxDeployItInitSchematicSchema,
  host?: Tree
): BaseAdapter {
  return getAdapterByApplicationType(
    getApplicationType(project.targets, host),
    project,
    options
  );
}

export function getApplications(
  workspace: WorkspaceDefinition,
  host: Tree
): { projectName: string; applicationType: ApplicationType }[] {
  const applications: {
    projectName: string;
    applicationType: ApplicationType;
  }[] = [];
  workspace.projects.forEach((project, projectName) => {
    const applicationType = getApplicationType(project.targets, host);
    if (applicationType) {
      applications.push({
        projectName,
        applicationType,
      });
    }
  });

  return applications;
}

export function getProjectConfig(context: BuilderContext) {
  const workspaceConfig = readWorkspaceConfig({ format: 'angularCli' });

  return workspaceConfig.projects[context.target.project];
}

export function getDistributionPath(context: BuilderContext) {
  const project = getProjectConfig(context);

  return resolve(
    context.workspaceRoot,
    project.architect.build.options.outputPath
  );
}
