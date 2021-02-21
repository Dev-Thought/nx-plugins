import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { Tree } from '@nrwl/devkit';
import { stdin } from 'mock-stdin';

import { createNestApp } from '../../utils-test/testing-generators';
import { answerScanQuestionsWithNoApp } from '../../utils-test/enquirer.utils';
import generator from './generator';
import { ScanGeneratorSchema } from './schema';

describe('scan generator', () => {
  let appTree: Tree;
  const options: ScanGeneratorSchema = {};

  let io = null;
  beforeAll(() => (io = stdin()));
  afterAll(() => io.restore());

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
  });

  describe('with applications', () => {
    beforeEach(async () => {
      appTree = await createNestApp(appTree, 'nest');
    });

    it('should aboard setup because of no selections', async () => {
      answerScanQuestionsWithNoApp(io);

      console.log('woop');
      await generator(appTree, options);
    });
  });
});
