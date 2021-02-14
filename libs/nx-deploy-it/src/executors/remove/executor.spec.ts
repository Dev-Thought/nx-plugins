import { RemoveExecutorSchema } from './schema';
import executor from './executor';

const options: RemoveExecutorSchema = {};

describe('Remove Executor', () => {
  it('can run', async () => {
    const output = await executor(options);
    expect(output.success).toBe(true);
  });
});
