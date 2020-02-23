import { resolve, join } from 'path';
import { SchematicContext, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { BaseAdapter } from '../init/adapter/base.adapter';
import { getApplicationType, ApplicationType } from './application-type';
import { InitOptions } from '../init/schema';
import { AngularAdapter } from '../init/adapter/angular.adapter';
import { NestJSAdapter } from '../init/adapter/nestjs.adapter';

export function getRealWorkspacePath() {
  // TODO!: get better way
  return process.cwd();
}

export function getPulumiBinaryPath() {
  return resolve(getRealWorkspacePath(), 'node_modules/.bin/pulumi');
}

export function getAdapter(
  project: ProjectDefinition,
  options: InitOptions
): BaseAdapter {
  const applicationType = getApplicationType(project.targets!.get('build')!);
  switch (applicationType) {
    case ApplicationType.ANGULAR:
      return new AngularAdapter(project, options, applicationType);
    case ApplicationType.NESTJS:
      return new NestJSAdapter(project, options, applicationType);
    default:
  }

  throw new Error(
    `Can't recognize application type. Supported list can be found here: https://github.com/Dev-Thought/ng-deploy-it`
  );
}
