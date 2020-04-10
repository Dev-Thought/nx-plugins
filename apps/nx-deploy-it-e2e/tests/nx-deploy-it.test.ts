import {
  ensureNxProject,
  runNxCommandAsync,
  uniq,
  runCommandAsync
} from '@nrwl/nx-plugin/testing';

jest.setTimeout(500000);

xdescribe('nx-deploy-it e2e', () => {
  let project: string;
  beforeAll(async done => {
    console.time('create-nx-workspace');
    ensureNxProject('@dev-thought/nx-deploy-it', 'dist/libs/nx-deploy-it');
    console.timeEnd('create-nx-workspace');
    done();
  });

  it('should create a workspace with nestjs and angular', async done => {
    console.time('nest');
    const projectNestJs = uniq('nestjs');
    await runNxCommandAsync(`generate @nrwl/nest:application ${projectNestJs}`);
    console.timeEnd('nest');

    console.time('angular');
    const projectAngular = uniq('angular');
    await runNxCommandAsync(`generate @nrwl/angular:app ${projectAngular}`);
    console.timeEnd('angular');

    done();
  });

  fit('should create a workspace with angular and angular universal', async done => {
    const projectAngular = uniq('angular');
    console.time('setup angular');
    await runNxCommandAsync(`generate @nrwl/angular:app ${projectAngular}`);
    console.timeEnd('setup angular');

    console.time('install @nguniversal/express-engine');
    await runCommandAsync(`npx yarn add @nguniversal/express-engine`);
    console.timeEnd('install @nguniversal/express-engine');

    console.time('setup install @nguniversal/express-engine');
    await runNxCommandAsync(
      `generate @nguniversal/express-engine:ng-add --clientProject ${projectAngular}`
    );
    console.timeEnd('setup install @nguniversal/express-engine');

    done();
  });
});
