import { DestroyExecutorSchema } from './schema';

export default async function runExecutor(
  options: DestroyExecutorSchema,
) {
  console.log('Executor ran for Destroy', options)
  return {
    success: true
  }
}

