import { PROVIDER } from "../utils/provider";
import { Tree } from '@angular-devkit/schematics';

export function createPulumiMockProjectInTree(
  tree: Tree,
  provider: PROVIDER,
  projectName: string
) {
  tree.create(
    `./apps/${projectName}/infrastructure/package.json`,
    JSON.stringify({
      dependencies: {
        '@pulumi/pulumi': '^1.2.3',
        '@pulumi/aws': '^1.2.3'
      }
    })
  );
}
