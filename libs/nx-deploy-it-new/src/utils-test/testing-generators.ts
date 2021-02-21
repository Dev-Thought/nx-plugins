import { Tree } from '@nrwl/devkit';
import { applicationGenerator as nestApplicationGenerator } from '@nrwl/nest';

export async function createNestApp(tree: Tree, appName: string): Promise<any> {
  await nestApplicationGenerator(tree, {
    name: appName,
    skipFormat: true,
  });
}
