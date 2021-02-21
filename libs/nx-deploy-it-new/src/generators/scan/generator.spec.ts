import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { addProjectConfiguration, logger, Tree } from '@nrwl/devkit';
import { stdin } from 'mock-stdin';

import {
  answerScanQuestions,
  answerScanQuestionsWithNoApp,
} from '../../utils-test/enquirer.utils';
import generator from './generator';
import { ScanGeneratorSchema } from './schema';
import initGenerator from '../init/generator';

jest.mock('../init/generator');

describe('scan generator', () => {
  let appTree: Tree;
  const options: ScanGeneratorSchema = {};
  const logSpy = jest.spyOn(logger, 'log');

  let io = null;
  beforeAll(() => (io = stdin()));
  afterAll(() => io.restore());

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace();
  });

  afterEach(() => {
    logSpy.mockReset();
    (initGenerator as jest.Mock).mockReset();
  });

  it('should run successfully', async () => {
    await generator(appTree, options);
    expect(logger.log).toMatchSnapshot();
  });

  describe('with applications', () => {
    it('should aboard setup because of no selections', async () => {
      addProjectConfiguration(appTree, 'angular', {
        root: '',
        targets: {
          build: { executor: '@angular-devkit/build-angular:browser' },
        },
      });

      answerScanQuestionsWithNoApp(io);

      await generator(appTree, options);
      expect(logger.log).toMatchSnapshot();
    });

    it('should setup the selected angular application', async () => {
      addProjectConfiguration(appTree, 'angular', {
        root: '',
        targets: {
          build: { executor: '@angular-devkit/build-angular:browser' },
        },
      });

      answerScanQuestions(io, 'eastasia');

      await generator(appTree, options);
      expect(initGenerator).toHaveBeenCalledTimes(1);
      expect(logger.log).toMatchSnapshot();
    });

    it('should setup 2 selected applications', async () => {
      addProjectConfiguration(appTree, 'angular', {
        root: 'angular',
        targets: {
          build: { executor: '@angular-devkit/build-angular:browser' },
        },
      });
      addProjectConfiguration(appTree, 'angularCustomWebpack', {
        root: 'angularCustomWebpack',
        targets: {
          build: { executor: '@angular-builders/custom-webpack:browser' },
        },
      });

      answerScanQuestions(io, 'eastasia');

      await generator(appTree, options);
      expect(initGenerator).toHaveBeenCalledTimes(2);
      expect(logger.log).toMatchSnapshot();
    });
  });
});
