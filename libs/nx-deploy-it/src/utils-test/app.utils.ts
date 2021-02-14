import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';

export function createApplication(
  testRunner: SchematicTestRunner,
  projectName: string,
  applicationType: 'nest' | 'express' | 'angular' | 'react',
  tree: Tree
) {
  return testRunner
    .runExternalSchematicAsync(
      `@nrwl/${applicationType}`,
      'application',
      {
        name: projectName,
      },
      tree
    )
    .toPromise();
}
