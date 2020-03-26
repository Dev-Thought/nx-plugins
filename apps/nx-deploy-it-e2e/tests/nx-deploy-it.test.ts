import {
  checkFilesExist,
  ensureNxProject,
  readJson,
  runNxCommandAsync,
  uniq
} from '@nrwl/nx-plugin/testing';

jest.setTimeout(120000);

xdescribe('nx-deploy-it e2e', () => {
  let project: string;
  beforeAll(async done => {
    ensureNxProject('@dev-thought/nx-deploy-it', 'dist/libs/nx-deploy-it');
    done();
  });

  beforeEach(async done => {
    project = uniq('nx-deploy-it');
    await runNxCommandAsync(`generate @nrwl/nest:application ${project}`);
    done();
  });

  it('should create nx-deploy-it with aws provider', async done => {
    console.log(`generate @dev-thought/nx-deploy-it:init ${project} --provider aws`);
    const result = await runNxCommandAsync(
      `generate @dev-thought/nx-deploy-it:init --project ${project} --provider aws`
    );

    expect(result.stderr).not.toBeDefined()
    expect(result.stdout).toContain('Builder run');

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
