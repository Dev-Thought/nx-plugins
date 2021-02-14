import { RemoveExecutorSchema } from './schema';

export default async function runExecutor(options: RemoveExecutorSchema) {
  console.log('Executor ran for Remove', options);
  return {
    success: true,
  };
}
