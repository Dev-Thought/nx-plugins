import { DeployExecutorSchema } from './schema';
import executor from './executor';

const options: DeployExecutorSchema = {};

describe('Deploy Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});