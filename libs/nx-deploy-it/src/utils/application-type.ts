import { TargetDefinition } from '@angular-devkit/core/src/workspace';

export enum ApplicationType {
  ANGULAR = 'angular',
  REACT = 'react',
  NESTJS = 'nestjs'
}

function isAngular(target: TargetDefinition): boolean {
  return target.builder === '@angular-devkit/build-angular:browser';
}

function isNestJS(target: TargetDefinition): boolean {
  return target.builder === '@nrwl/node:build';
}

function isReact(target: TargetDefinition): boolean {
  return (
    target.builder === '@nrwl/web:build' &&
    target.options.webpackConfig.toString().startsWith('@nrwl/react') &&
    target.options.main.toString().endsWith('.tsx')
  );
}

export function getApplicationType(target: TargetDefinition): ApplicationType {
  if (!target) {
    return null;
  }

  if (isAngular(target)) {
    return ApplicationType.ANGULAR;
  }
  if (isReact(target)) {
    return ApplicationType.REACT;
  }

  if (isNestJS(target)) {
    return ApplicationType.NESTJS;
  }

  return null;
}
