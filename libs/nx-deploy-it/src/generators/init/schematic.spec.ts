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
import { createApplication } from '../../utils-test/app.utils';
import {
  answerInitQuestionsAWS,
  answerInitQuestionsAzure,
  answerInitQuestionsGCP,
} from '../../utils-test/enquirer.utils';

describe('init schematic', () => {
  let appTree: Tree;
  const projectName = 'mock-project';

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('pulumi project', () => {
    const options: NxDeployItInitSchematicSchema = {
      project: projectName,
      provider: PROVIDER.AWS,
    };

    beforeEach(async () => {
      appTree = await createApplication(
        testRunner,
        projectName,
        'nest',
        appTree
      );

      spawnSync.mockImplementation(() => {
        createPulumiMockProjectInTree(appTree, PROVIDER.AWS, projectName);
        return {} as any;
      });
      unlinkSync.mockImplementation();
    });

    it('should be initialized', async () => {
      answerInitQuestionsAWS(io, null, null);

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      expect(
        tree.exists(`apps/${projectName}/infrastructure/Pulumi.yaml`)
      ).toBeTruthy();

      expect(spawnSync).toHaveBeenCalled();
      expect(spawnSync.mock.calls[0][1][1]).toContain('aws-typescript');
      expect(spawnSync.mock.calls[0][1][3]).toBe(projectName);
      expect(spawnSync.mock.calls[0][1][5]).toContain(
        `apps/${projectName}/infrastructure`
      );
      expect(spawnSync.mock.calls[0][1][7]).toContain(
        'Infrastructure as Code based on Pulumi - managed by @dev-thought/nx-deploy-it'
      );
      expect(unlinkSync).toHaveBeenCalledTimes(5);
    });

    it('should fail if the project already has an deploy integration', async () => {
      answerInitQuestionsAWS(io, null, null);

      await testRunner.runSchematicAsync('init', options, appTree).toPromise();
      await testRunner.runSchematicAsync('init', options, appTree).toPromise();

      expect(spawnSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('aws provider', () => {
    const options: NxDeployItInitSchematicSchema = {
      project: projectName,
      provider: PROVIDER.AWS,
    };

    beforeEach(async () => {
      appTree = await createApplication(
        testRunner,
        projectName,
        'nest',
        appTree
      );

      spawnSync.mockImplementation(() => {
        createPulumiMockProjectInTree(appTree, PROVIDER.AWS, projectName);
        return {} as any;
      });
      unlinkSync.mockImplementation();
    });

    it('should add dependencies to package.json', async () => {
      answerInitQuestionsAWS(io, null, null);

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
      expect(packageJSON.dependencies['@pulumi/awsx']).toBeDefined();
    });

    it('should extend the project configuration options with aws profile', async () => {
      answerInitQuestionsAWS(io, 'eu-central-1', 'my-aws-profile');

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const workspaceJson = readJsonInTree(tree, 'workspace.json');
      expect(
        workspaceJson.projects[projectName].architect.deploy
      ).toMatchSnapshot();
      expect(
        workspaceJson.projects[projectName].architect.destroy
      ).toMatchSnapshot();
    });

    it('should extend the project default configuration options', async () => {
      answerInitQuestionsAWS(io, 'eu-central-1');

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const workspaceJson = readJsonInTree(tree, 'workspace.json');
      expect(
        workspaceJson.projects[projectName].architect.deploy
      ).toMatchSnapshot('Deploy Action');
      expect(
        workspaceJson.projects[projectName].architect.destroy
      ).toMatchSnapshot('Destroy Action');
    });
  });

  describe('azure provider', () => {
    const options: NxDeployItInitSchematicSchema = {
      project: projectName,
      provider: PROVIDER.AZURE,
    };

    beforeEach(async () => {
      appTree = await createApplication(
        testRunner,
        projectName,
        'nest',
        appTree
      );

      spawnSync.mockImplementation(() => {
        createPulumiMockProjectInTree(appTree, PROVIDER.AZURE, projectName);
        return {} as any;
      });
      unlinkSync.mockImplementation();
    });

    it('should add dependencies to package.json', async () => {
      answerInitQuestionsAzure(io, null);

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const packageJSON = readJsonInTree(tree, 'package.json');
      expect(packageJSON.dependencies['@pulumi/pulumi']).toBeDefined();
      expect(packageJSON.dependencies['@pulumi/azure']).toBeDefined();
    });

    it('should extend the project default configuration options', async () => {
      answerInitQuestionsAzure(io, 'eastasia');

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const workspaceJson = readJsonInTree(tree, 'workspace.json');
      expect(
        workspaceJson.projects[projectName].architect.deploy
      ).toMatchSnapshot('Deploy Action');
      expect(
        workspaceJson.projects[projectName].architect.destroy
      ).toMatchSnapshot('Destroy Action');
    });
  });

  describe('google cloud platform provider', () => {
    const options: NxDeployItInitSchematicSchema = {
      project: projectName,
      provider: PROVIDER.GOOGLE_CLOUD_PLATFORM,
    };

    beforeEach(async () => {
      appTree = await createApplication(
        testRunner,
        projectName,
        'nest',
        appTree
      );

      spawnSync.mockImplementation(() => {
        createPulumiMockProjectInTree(
          appTree,
          PROVIDER.GOOGLE_CLOUD_PLATFORM,
          projectName
        );
        return {} as any;
      });
      unlinkSync.mockImplementation();
    });

    it('should add dependencies to package.json', async () => {
      answerInitQuestionsGCP(io, 'my-google-project-id', 'europe-west1');

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const packageJSON = readJsonInTree(tree, 'package.json');
      expect(packageJSON.dependencies['@pulumi/pulumi']).toBeDefined();
      expect(packageJSON.dependencies['@pulumi/gcp']).toBeDefined();
    });

    it('should extend the project default configuration options', async () => {
      answerInitQuestionsGCP(io, 'my-google-project-id', 'europe-west1');

      const tree = await testRunner
        .runSchematicAsync('init', options, appTree)
        .toPromise();

      const workspaceJson = readJsonInTree(tree, 'workspace.json');
      expect(
        workspaceJson.projects[projectName].architect.deploy
      ).toMatchSnapshot('Deploy Action');
      expect(
        workspaceJson.projects[projectName].architect.destroy
      ).toMatchSnapshot('Destroy Action');
    });
  });
});
