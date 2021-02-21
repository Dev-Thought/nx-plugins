import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

import generator from './generator';
import { InitGeneratorSchema } from './schema';
import { PROVIDER } from '../../utils/provider';

describe('init generator', () => {
  let appTree: Tree;
  const options: InitGeneratorSchema = {
    provider: PROVIDER.AWS,
    project: 'test',
  };

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    const config = readProjectConfiguration(appTree, 'test');
    expect(config).toBeDefined();
  });
});
