import { NxDeployItDeployBuilderSchema } from './schema';
import { MockBuilderContext } from '@nrwl/workspace/testing';
import * as childProcess from 'child_process';
import { getMockContext } from '../../utils-test/builders.utils';
import { runBuilder } from './builder';
import { DeployTargetOptions } from './target-options';
import * as nrwlWorkspce from '@nrwl/workspace';
import * as utils from '../../utils/application-type';
import * as ncc from '@zeit/ncc';
import * as fsExtra from 'fs-extra';
import * as fs from 'fs';
jest.mock('@zeit/ncc');

const options: NxDeployItDeployBuilderSchema = {};

describe('Command Runner Builder - Deploy', () => {
  let context: MockBuilderContext;
  let options: NxDeployItDeployBuilderSchema;
  const spawnSync = jest.spyOn(childProcess, 'spawnSync');

  beforeEach(async () => {
    context = await getMockContext();

    options = {
      project: 'project-mock'
    };

    spawnSync.mockReturnValue({
      pid: null,
      output: [''],
      error: null,
      signal: null,
      status: null,
      stderr: null,
      stdout: null
    });

    await context.addTarget(
      { project: 'project-mock', configuration: 'dev', target: 'deploy' },
      'deploy'
    );
    context.target = {
      project: 'project-mock',
      configuration: 'dev',
      target: 'deploy'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run deploy for a react app', async () => {
    jest.spyOn(context, 'getTargetOptions').mockResolvedValue({
      main: 'somewhere.ts'
    } as DeployTargetOptions);
    const scheduleTargetSpy = jest
      .spyOn(context, 'scheduleTarget')
      .mockResolvedValue({
        result: new Promise(resolve => resolve({ success: true }))
      } as any);
    jest.spyOn(nrwlWorkspce, 'readWorkspaceConfigPath').mockReturnValue({
      projects: {
        'project-mock': {
          architect: {
            build: {
              builder: '@nrwl/web:build',
              options: {
                main: 'apps/project-mock/src/main.tsx',
                webpackConfig: '@nrwl/react/plugins/webpack',
                outputPath: 'dist/apps/project-mock'
              }
            }
          }
        }
      }
    });
    const result = await runBuilder(options, context).toPromise();

    expect(scheduleTargetSpy.mock.calls[0]).toMatchSnapshot(
      'build schedule target'
    );
    expect(spawnSync.mock.calls[0][1]).toMatchSnapshot(
      'create stack if not exists'
    );
    expect(spawnSync.mock.calls[1][1]).toMatchSnapshot('deploy with pulumi');
    expect(result).toMatchSnapshot('Result of the pulumi script');
  });

  it('should update pulumi properties', async () => {
    jest.spyOn(context, 'getTargetOptions').mockResolvedValue({
      main: 'somewhere.ts',
      pulumi: {
        'aws:region': 'eu-central-1'
      }
    } as DeployTargetOptions);
    jest.spyOn(context, 'scheduleTarget').mockResolvedValue({
      result: new Promise(resolve => resolve({ success: true }))
    } as any);
    jest.spyOn(nrwlWorkspce, 'readWorkspaceConfigPath').mockReturnValue({
      projects: {
        'project-mock': {
          architect: {
            build: {
              builder: '@nrwl/web:build',
              options: {
                main: 'apps/project-mock/src/main.tsx',
                webpackConfig: '@nrwl/react/plugins/webpack',
                outputPath: 'dist/apps/project-mock'
              }
            }
          }
        }
      }
    });

    await runBuilder(options, context).toPromise();

    expect(spawnSync.mock.calls[1][1]).toMatchSnapshot('deploy with pulumi');
  });

  it('should deploy with custom build (ncc)', async () => {
    jest.spyOn(context, 'getTargetOptions').mockResolvedValue({
      main: 'somewhere.ts',
      pulumi: {
        'aws:region': 'eu-central-1'
      }
    } as DeployTargetOptions);
    jest.spyOn(context, 'scheduleTarget').mockResolvedValue({
      result: new Promise(resolve => resolve({ success: true }))
    } as any);
    jest
      .spyOn(utils, 'getApplicationType')
      .mockReturnValueOnce(utils.ApplicationType.NESTJS);
    jest.spyOn(nrwlWorkspce, 'readWorkspaceConfigPath').mockReturnValue({
      projects: {
        'project-mock': {
          architect: {
            build: {
              builder: '@nrwl/node:build',
              options: {
                outputPath: 'dist/apps/api',
                main: 'apps/api/src/main.ts',
                tsConfig: 'apps/api/tsconfig.app.json',
                assets: ['apps/api/src/assets']
              }
            }
          },
          root: 'apps/api'
        }
      }
    });
    jest.spyOn(process, 'chdir').mockReturnValue();
    jest.spyOn(process, 'cwd').mockReturnValue('mockProcessCwd');
    (ncc as jest.SpyInstance).mockResolvedValueOnce({
      code: 'Some Code',
      asset: { 'asset1.png': { source: 'code of asset 1' } }
    });
    jest.spyOn(fsExtra, 'ensureDirSync').mockReturnThis();
    jest.spyOn(fsExtra, 'ensureFileSync').mockReturnThis();
    jest.spyOn(fs, 'writeFileSync').mockReturnThis();

    await runBuilder(options, context).toPromise();

    expect(process.cwd).toHaveBeenCalled();
    expect(process.chdir).toHaveBeenCalledWith('/root/apps/api/infrastructure');
    expect(process.chdir).toHaveBeenCalledWith('mockProcessCwd');

    // check if build was written
    expect(fsExtra.ensureDirSync).toHaveBeenCalledWith(
      '/root/apps/api/infrastructure/functions/dist/main'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/root/apps/api/infrastructure/functions/dist/main/index.js',
      'Some Code'
    );

    // check if assets were written
    expect(fsExtra.ensureFileSync).toHaveBeenCalledWith(
      '/root/apps/api/infrastructure/functions/dist/main/asset1.png'
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/root/apps/api/infrastructure/functions/dist/main/asset1.png',
      'code of asset 1'
    );
  });
});
