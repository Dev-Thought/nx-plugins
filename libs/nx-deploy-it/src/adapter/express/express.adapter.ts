import { BaseAdapter } from '../base.adapter';
import { PROVIDER } from '../../utils/provider';
import { prompt } from 'enquirer';
import { Rule, applyTemplates } from '@angular-devkit/schematics';
import { QUESTIONS } from '../../utils/questions';
import { NxDeployItInitSchematicSchema } from '../../generators/init/schema';
import { getDistributionPath, getProjectConfig } from '../../utils/workspace';
import { NxDeployItDeployBuilderSchema } from '../../executors/deploy/schema';
import { BuilderOutput, BuilderContext } from '@angular-devkit/architect';
import { Observable, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { resolve } from 'path';
import * as ncc from '@vercel/ncc';
import { ensureDirSync, ensureFileSync } from 'fs-extra';
import { writeFileSync } from 'fs';

export class ExpressAdapter extends BaseAdapter {
  async extendOptionsByUserInput() {
    await super.extendOptionsByUserInput();
    const options = this.options as NxDeployItInitSchematicSchema;
    const questions: any[] = [];

    if (
      options.provider === PROVIDER.GOOGLE_CLOUD_PLATFORM &&
      !options['gcp:region']
    ) {
      questions.push(QUESTIONS.gcpRegionCloudFunctions);
    }

    const anwsers = await prompt(questions);
    this.options = {
      ...options,
      ...anwsers,
    };
  }

  addRequiredDependencies() {
    const dependencies = super.addRequiredDependencies();

    if (this.options.provider === PROVIDER.AZURE) {
      dependencies.push({
        name: 'azure-aws-serverless-express',
        version: '^0.1.5',
      });
    }
    if (this.options.provider === PROVIDER.AWS) {
      dependencies.push({
        name: 'aws-serverless-express',
        version: '^3.3.6',
      });
    }
    return dependencies;
  }

  getApplicationTypeTemplate(): Rule {
    return applyTemplates({
      rootDir: 'src',
      getRootDirectory: () => 'src',
      stripTsExtension: (s: string) => s.replace(/\.ts$/, ''),
      projectName: this.options.project,
    });
  }

  getApplicationTemplatePath() {
    return `${super.getApplicationTemplatePath()}/express/`;
  }

  getDeployActionConfiguration(): any {
    const config = super.getDeployActionConfiguration();
    return config;
  }

  getDestroyActionConfiguration(): any {
    const config = super.getDestroyActionConfiguration();
    return config;
  }

  deploy(
    context: BuilderContext,
    cwd: string,
    options: NxDeployItDeployBuilderSchema,
    configuration: string,
    targetOptions: any
  ): Observable<BuilderOutput> {
    const distributationPath = getDistributionPath(context);

    const project = getProjectConfig(context);
    const infrastructureFolder = resolve(
      context.workspaceRoot,
      project.root,
      'infrastructure'
    );

    const processCwd = process.cwd();
    process.chdir(infrastructureFolder);

    const build$: Observable<BuilderOutput> = from(
      ncc(resolve(infrastructureFolder, 'functions/main/index.ts'), {
        cache: resolve(infrastructureFolder, 'buildcache'),
      })
    ).pipe(
      map(
        (buildResult: {
          code: string;
          asset: { [index: string]: { source: string } };
        }) => {
          process.chdir(processCwd);
          ensureDirSync(resolve(infrastructureFolder, 'functions/dist/main'));
          // compiled javascript
          writeFileSync(
            resolve(infrastructureFolder, 'functions/dist/main/index.js'),
            buildResult.code
          );
          // assets
          for (const file in buildResult.asset) {
            const content = buildResult.asset[file];
            ensureFileSync(
              resolve(infrastructureFolder, `functions/dist/main/${file}`)
            );
            writeFileSync(
              resolve(infrastructureFolder, `functions/dist/main/${file}`),
              content.source.toString()
            );
          }
          return { success: true };
        }
      )
    );

    return build$.pipe(
      switchMap(() =>
        this.up(
          cwd,
          options,
          configuration,
          targetOptions,
          distributationPath,
          context.target.project
        )
      )
    );
  }
}
