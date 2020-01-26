import {
  createBuilder,
  BuilderOutput,
  BuilderContext
} from '@angular-devkit/architect';
import { deploy } from './actions/deploy';
import { DeployOptions } from './options';

export default createBuilder(
  async (
    options: DeployOptions,
    context: BuilderContext
  ): Promise<BuilderOutput> => {
    if (!context.target) {
      throw new Error('Not possible to deploy application without a target');
    }

    try {
      await deploy(context, options);
    } catch (e) {
      context.logger.error(`Error when trying to deploy:`);
      context.logger.error(JSON.stringify(e));
      return { success: false };
    }

    return { success: true };
  }
);
