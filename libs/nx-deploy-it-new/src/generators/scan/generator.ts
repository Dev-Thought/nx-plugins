import { formatFiles, Tree, logger, convertNxGenerator } from '@nrwl/devkit';
import { ApplicationType } from '../../utils/application-type';
import { QUESTIONS } from '../../utils/questions';
import { getApplications } from '../../utils/workspace';
import { ScanGeneratorSchema } from './schema';
import { prompt } from 'enquirer';
import { PROVIDER } from '../../utils/provider';
import initGenerator from '../init/generator';

interface NormalizedSchema extends ScanGeneratorSchema {
  parsedTags: string[];
}

function normalizeOptions(options: ScanGeneratorSchema): NormalizedSchema {
  const parsedTags = options.tags
    ? options.tags.split(',').map((s) => s.trim())
    : [];

  return {
    ...options,
    parsedTags,
  };
}

export async function scanGenerator(host: Tree, options: ScanGeneratorSchema) {
  // const normalizedOptions = normalizeOptions(options);
  const applications = getApplications(host);
  try {
    const questions: any[] = [];

    if (applications.length === 0) {
      logger.log('info', 'no applications found');
      throw new Error();
    }

    logger.log(
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
      choices: applications.map((app) => ({
        name: `${app.projectName} (${app.applicationType})`,
        value: app,
      })),
      result: function (result: string) {
        return Object.values(this.map(result));
      },
    } as any);

    if (choosenApplications.setupApplications.length === 0) {
      logger.log('info', 'No applications selected. Skipping setup');
      throw new Error();
    }

    const { provider } = await prompt<{ provider: PROVIDER }>([
      QUESTIONS.whichProvider,
    ]);

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

    const generatorOptions = await prompt(questions);

    for (const application of applications) {
      await initGenerator(host, {
        provider,
        project: application.projectName,
        ...generatorOptions,
      });
    }
    await formatFiles(host);
  } catch (error) {
    return;
  }
}

export default scanGenerator;
export const scanSchematic = convertNxGenerator(scanGenerator);
