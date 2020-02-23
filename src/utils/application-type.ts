import { TargetDefinition } from '@angular-devkit/core/src/workspace';

export enum ApplicationType {
  ANGULAR = 'angular',
  NESTJS = 'nestjs'
}

export function getApplicationType(target: TargetDefinition) {
  if (target && target.builder) {
    switch (target.builder) {
      case '@angular-devkit/build-angular:browser':
        return ApplicationType.ANGULAR;
      case '@nrwl/node:build':
        return ApplicationType.NESTJS;
    }
  }

  throw new Error(`Can't find a supported build target for the project`);
}
