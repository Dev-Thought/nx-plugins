import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { createEmptyWorkspace } from '@nrwl/workspace/testing';
import { join } from 'path';

import { stdin } from 'mock-stdin';
import * as childProcess from 'child_process';
import * as fs from 'fs';
import { createPulumiMockProjectInTree } from '../../utils-test/pulumi.mock';
import { PROVIDER } from '../../utils/provider';
import { createApplication } from '../../utils-test/app.utils';
import { clearTimestampFromLogEntry } from '../../utils-test/logger.utils';
import {
  answerScanQuestions,
  answerScanQuestionsWithNoApp
} from '../../utils-test/enquirer.utils';
import * as schematics from '@angular-devkit/schematics';

describe('scan schematic', () => {
  let appTree: Tree;
  const projectName = 'mock-project';
  let testRunner: SchematicTestRunner;

  const unlinkSync = jest.spyOn(fs, 'unlinkSync');
  const spawnSync = jest.spyOn(childProcess, 'spawnSync');

  const originReadFileSync = fs.readFileSync;

  (fs.readFileSync as any) = jest
    .fn(originReadFileSync)
    .mockImplementation((path, options) => {
      if (path === `apps/${projectName}/infrastructure/Pulumi.yaml`) {
        return '';
      }

      return originReadFileSync(path, options);
    });

  let io = null;
  beforeAll(() => (io = stdin()));
  afterAll(() => io.restore());

  beforeEach(() => {
    appTree = createEmptyWorkspace(Tree.empty());

    testRunner = new SchematicTestRunner(
      '@dev-thought/nx-deploy-it',
      join(__dirname, '../../../collection.json')
    );

    spawnSync.mockImplementation(() => {
      createPulumiMockProjectInTree(appTree, PROVIDER.AZURE, projectName);
      return {} as any;
    });
    unlinkSync.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should find no applications', async () => {
    testRunner.logger.subscribe(log => {
      clearTimestampFromLogEntry(log);
      expect(log).toMatchSnapshot();
    });

    await testRunner.runSchematicAsync('scan', {}, appTree).toPromise();
  });

  describe('with applications', () => {
    beforeEach(async () => {
      appTree = await createApplication(
        testRunner,
        projectName,
        'nest',
        appTree
      );
    });

    it('should aboard setup because of no selections', async () => {
      answerScanQuestionsWithNoApp(io);

      testRunner.logger.subscribe(log => {
        clearTimestampFromLogEntry(log);
        expect(log).toMatchSnapshot();
      });

      await testRunner.runSchematicAsync('scan', {}, appTree).toPromise();
    });

    it('should setup the selected nest application', async () => {
      const spyInstance = jest
        .spyOn(schematics, 'externalSchematic')
        .mockImplementation(() => schematics.chain([]));
      answerScanQuestions(io, 'eastasia');

      testRunner.logger.subscribe(log => {
        clearTimestampFromLogEntry(log);
        expect(log).toMatchSnapshot();
      });

      await testRunner.runSchematicAsync('scan', {}, appTree).toPromise();
      expect(schematics.externalSchematic).toHaveBeenCalled();
      expect(spyInstance.mock.calls[0]).toMatchSnapshot();
    });
  });
});
