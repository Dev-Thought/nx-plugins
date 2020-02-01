import {
  createBuilder,
  BuilderOutput,
  BuilderContext
} from '@angular-devkit/architect';
import { destroy } from './actions/destroy';
import { DestroyOptions } from './options';

export default createBuilder(
  async (
    options: DestroyOptions,
    context: BuilderContext
  ): Promise<BuilderOutput> => {
    if (!context.target) {
      throw new Error('Not possible to deploy application without a target');
    }

    try {
      await destroy(context, options);
    } catch (e) {
      context.logger.error(`Error when trying to deploy:`);
      context.logger.error(JSON.stringify(e));
      return { success: false };
    }

    return { success: true };
  }
);
