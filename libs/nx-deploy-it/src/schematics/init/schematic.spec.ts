import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';
import { NxDeployItInitSchematicSchema } from './schema';

describe('init schematic', () => {
  let appTree: Tree;

  const testRunner = new SchematicTestRunner(
    '@dev-thought/nx-deploy-it',
    join(__dirname, '../../../collection.json')
  );

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it('should run successfully', async () => {
    const options: NxDeployItInitSchematicSchema = {
      project: 'mock-project',
      provider: 'aws'
    };
    await expect(
      testRunner.runSchematicAsync('init', options, appTree).toPromise()
    ).resolves.not.toThrowError();
  });
});
