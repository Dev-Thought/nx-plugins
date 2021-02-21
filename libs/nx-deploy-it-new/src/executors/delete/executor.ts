import { DeleteExecutorSchema } from './schema';

export default async function runExecutor(
  options: DeleteExecutorSchema,
) {
  console.log('Executor ran for Delete', options)
  return {
    success: true
  }
}

