import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';

describe('scan schematic', () => {
  let appTree: Tree;

  const testRunner = new SchematicTestRunner(
    '@dev-thought/nx-deploy-it',
    join(__dirname, '../../../collection.json')
  );

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  it('should run without findings', async () => {
    await expect(
      testRunner.runSchematicAsync('scan', {}, appTree).toPromise()
    ).resolves.not.toThrowError();
  });
});
