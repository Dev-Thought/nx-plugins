import { NxDeployItDestroyBuilderSchema } from './schema';
import { MockBuilderContext } from '@nrwl/workspace/testing';
import { runBuilder } from './builder';
import { getMockContext } from '../../utils-test/builders.utils';
import { DestroyTargetOptions } from './target-options';
import * as childProcess from 'child_process';

describe('Command Runner Builder - Destroy', () => {
  let context: MockBuilderContext;
  let options: NxDeployItDestroyBuilderSchema;
  const spawnSync = jest.spyOn(childProcess, 'spawnSync');

  beforeEach(async () => {
    context = await getMockContext();

    options = {
      project: 'project-mock',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fail if no target exists', async () => {
    const result = await runBuilder(options, context).toPromise();

    expect(result).toMatchSnapshot();
  });

  it('should run destroy', async () => {
    jest.spyOn(context, 'getTargetOptions').mockResolvedValue({
      main: 'somewhere.ts',
    } as DestroyTargetOptions);
    spawnSync.mockReturnValue({
      pid: null,
      output: [''],
      error: null,
      signal: null,
      status: null,
      stderr: null,
      stdout: null,
    });
    await context.addTarget(
      { project: 'project-mock', configuration: 'dev', target: 'destroy' },
      'destroy'
    );
    context.target = {
      project: 'project-mock',
      configuration: 'dev',
      target: 'destroy',
    };
    const result = await runBuilder(options, context).toPromise();

    // expect(spawnSync.mock.calls[0][1]).toMatchSnapshot('Pulumi arguments');
    expect(result).toMatchSnapshot('Result of the pulumi script');
  });

  it('should run destroy and return success: false if pulumi fails', async () => {
    jest.spyOn(context, 'getTargetOptions').mockResolvedValue({
      main: 'somewhere.ts',
    } as DestroyTargetOptions);
    spawnSync.mockReturnValue({
      pid: null,
      output: [''],
      error: new Error('Pulumi failed'),
      signal: null,
      status: null,
      stderr: null,
      stdout: null,
    });
    await context.addTarget(
      { project: 'project-mock', configuration: 'dev', target: 'destroy' },
      'destroy'
    );
    context.target = {
      project: 'project-mock',
      configuration: 'dev',
      target: 'destroy',
    };

    const result = await runBuilder(options, context).toPromise();
    expect(result).toMatchSnapshot('match result');
  });
});
