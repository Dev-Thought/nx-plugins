import {
  addProjectConfiguration,
  convertNxGenerator,
  formatFiles,
  generateFiles,
  getWorkspaceLayout,
  names,
  offsetFromRoot,
  Tree,
} from '@nrwl/devkit';
import * as path from 'path';
import { InitGeneratorSchema } from './schema';

interface NormalizedSchema extends InitGeneratorSchema {
  projectName: string;
  projectRoot: string;
  projectDirectory: string;
  parsedTags: string[];
}

export async function initGenerator(host: Tree, options: InitGeneratorSchema) {
  await formatFiles(host);
}

export default initGenerator;
export const scanSchematic = convertNxGenerator(initGenerator);
