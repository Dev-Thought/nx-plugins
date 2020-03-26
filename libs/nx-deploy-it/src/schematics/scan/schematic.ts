import {
  chain,
  Rule,
  Tree,
  SchematicContext,
  externalSchematic
} from '@angular-devkit/schematics';
import { getWorkspace } from '@nrwl/workspace';
import { getApplications } from '../../utils/workspace';
import { prompt } from 'enquirer';
import { ApplicationType } from '../../utils/application-type';
import { QUESTIONS } from '../../utils/questions';
import { PROVIDER } from '../../utils/provider';

export default function(): Rule {
  return async (host: Tree, context: SchematicContext): Promise<Rule> => {
    const workspace = await getWorkspace(host);
    const applications = getApplications(workspace);
    const questions: any[] = [];

    if (applications.length === 0) {
      context.logger.log('info', 'no applications found');
      return chain([]);
    }

    context.logger.log(
      'info',
      `We found ${applications.length} supported applications.`
    );

    const choosenApplications = await prompt<{
      setupApplications: {
        projectName: string;
        applicationType: ApplicationType;
      }[];
    }>({
      ...QUESTIONS.setupApplications,
      choices: applications.map(app => ({
        name: `${app.projectName} (${app.applicationType})`,
        value: app
      })),
      result: function(result: string) {
        return Object.values(this.map(result));
      }
    } as any);

    if (choosenApplications.setupApplications.length === 0) {
      context.logger.log('info', 'No applications selected. Skipping setup');
      return chain([]);
    }

    const { provider } = await prompt([QUESTIONS.whichProvider as any]);

    switch (provider) {
      case PROVIDER.AWS:
        questions.push(QUESTIONS.awsProfile, QUESTIONS.awsRegion);
        break;

      case PROVIDER.AZURE:
        questions.push(QUESTIONS.azureLocation);
        break;

      case PROVIDER.GOOGLE_CLOUD_PLATFORM:
        questions.push(QUESTIONS.gcpProjectId);
        break;

      default:
        break;
    }

    const options = await prompt(questions);

    return chain(
      choosenApplications.setupApplications.map(application => {
        return externalSchematic('@dev-thought/nx-deploy-it', 'init', {
          ...options,
          provider,
          project: application.projectName
        });
      })
    );
  };
}
