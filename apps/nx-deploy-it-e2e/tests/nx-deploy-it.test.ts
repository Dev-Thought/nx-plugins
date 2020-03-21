import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq
} from '@nrwl/nx-plugin/testing';
describe('nx-deploy-it e2e', () => {
  xit('should create nx-deploy-it with aws provider', async done => {
    const plugin = uniq('nx-deploy-it');
    ensureNxProject('@dev-thought/nx-deploy-it', 'dist/libs/nx-deploy-it');
    await runNxCommandAsync(
      `generate @dev-thought/nx-deploy-it:init ${plugin} --provider aws`
    );

    const result = await runNxCommandAsync(`deploy ${plugin}`);
    expect(result.stdout).toContain('Builder ran');

    done();
  });

  xdescribe('--directory', () => {
    it('should create src in the specified directory', async done => {
      const plugin = uniq('nx-deploy-it');
      ensureNxProject('@dev-thought/nx-deploy-it', 'dist/libs/nx-deploy-it');
      await runNxCommandAsync(
        `generate @dev-thought/nx-deploy-it:nxDeployIt ${plugin} --directory subdir`
      );
      expect(() =>
        checkFilesExist(`libs/subdir/${plugin}/src/index.ts`)
      ).not.toThrow();
      done();
    });
  });

  xdescribe('--tags', () => {
    it('should add tags to nx.json', async done => {
      const plugin = uniq('nx-deploy-it');
      ensureNxProject('@dev-thought/nx-deploy-it', 'dist/libs/nx-deploy-it');
      await runNxCommandAsync(
        `generate @dev-thought/nx-deploy-it:nxDeployIt ${plugin} --tags e2etag,e2ePackage`
      );
      const nxJson = readJson('nx.json');
      expect(nxJson.projects[plugin].tags).toEqual(['e2etag', 'e2ePackage']);
      done();
    });
  });
});
