import { PROVIDER } from '../utils/provider';
import { Tree } from '@angular-devkit/schematics';

export function createPulumiMockProjectInTree(
  tree: Tree,
  provider: PROVIDER,
  projectName: string
) {
  let dependencies: { [index: string]: string } = {
    '@pulumi/pulumi': '^1.2.3',
  };
  switch (provider) {
    case PROVIDER.AWS:
      dependencies = {
        ...dependencies,
        '@pulumi/aws': '^1.2.3',
        '@pulumi/awsx': '^1.2.3',
      };
      break;

    case PROVIDER.AZURE:
      dependencies = {
        ...dependencies,
        '@pulumi/azure': '^1.2.3',
      };
      break;
    case PROVIDER.GOOGLE_CLOUD_PLATFORM:
      dependencies = {
        ...dependencies,
        '@pulumi/gcp': '^1.2.3',
      };
      break;

    default:
      break;
  }

  tree.create(
    `./apps/${projectName}/infrastructure/package.json`,
    JSON.stringify({
      dependencies,
    })
  );
}
