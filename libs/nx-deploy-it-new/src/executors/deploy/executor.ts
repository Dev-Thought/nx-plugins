import { DeployExecutorSchema } from './schema';

export default async function runExecutor(
  options: DeployExecutorSchema,
) {
  console.log('Executor ran for Deploy', options)
  return {
    success: true
  }
}

