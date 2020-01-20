import { Rule, Tree, chain, noop } from '@angular-devkit/schematics';
import { readJsonInTree, addDepsToPackageJson } from '@nrwl/workspace';
import { pulumiVersion } from '../utils/versions';

export default function(): Rule {
  return chain([checkDependenciesInstalled()]);
}

function checkDependenciesInstalled(): Rule {
  return (host: Tree): Rule => {
    const packageJson = readJsonInTree(host, 'package.json');
    const devDependencyList: { name: string; version: string }[] = [];
    if (!packageJson.devDependencies['@dev-thought/pulumi-npm']) {
      devDependencyList.push({
        name: '@dev-thought/pulumi-npm',
        version: pulumiVersion
      });
    }

    if (!devDependencyList.length) {
      return noop();
    }

    return addDepsToPackageJson(
      {},
      devDependencyList.reduce((dictionary, value) => {
        dictionary[value.name] = value.version;
        return dictionary;
      }, {})
    );
  };
}
