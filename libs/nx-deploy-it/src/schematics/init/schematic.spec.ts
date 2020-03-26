import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';
import { NxDeployItInitSchematicSchema } from './schema';
import { readJsonInTree } from '@nrwl/workspace';
import { stdin } from 'mock-stdin';

import { PROVIDER } from '../../utils/provider';
import { createPulumiMockProjectInTree } from '../../utils-test/pulumi.mock';
import * as childProcess from 'child_process';
import * as fs from 'fs';

// Key codes
const keys = {
  up: '\x1B\x5B\x41',
  down: '\x1B\x5B\x42',
  enter: '\x0D',
  space: '\x20'
};

// helper function for timing
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

describe('init schematic', () => {
  let appTree: Tree;
  const projectName = 'mock-project';

  const unlinkSync = jest.spyOn(fs, 'unlinkSync');
  const spawnSync = jest.spyOn(childProcess, 'spawnSync');

  const testRunner = new SchematicTestRunner(
    '@dev-thought/nx-deploy-it',
    join(__dirname, '../../../collection.json')
  );

  let io = null;
  beforeAll(() => (io = stdin()));
  afterAll(() => io.restore());

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());
  });

  describe('aws provider', () => {
    const options: NxDeployItInitSchematicSchema = {
      project: projectName,
      provider: 'aws'
    };

    it('should add dependencies to package.json', async () => {
      appTree = await testRunner
        .runExternalSchematicAsync(
          '@nrwl/nest',
          'application',
          {
            name: projectName
          },
          appTree
        )
        .toPromise();

      const initQuestions = async () => {
        // aws region
        io.send(keys.enter);
        await delay(10);

        // aws profile
        io.send('my-aws-profile');
        io.send(keys.enter);
      };
      setTimeout(() => initQuestions().then(), 5);

      spawnSync.mockImplementation(() => {
        createPulumiMockProjectInTree(appTree, PROVIDER.AWS, projectName);
        return {} as any;
      });
      unlinkSync.mockImplementation();
      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const packageJSON = readJsonInTree(tree, 'package.json');
      expect(packageJSON.dependencies['@pulumi/pulumi']).toBeDefined();
      expect(packageJSON.dependencies['@pulumi/aws']).toBeDefined();
    });
  });
});
