import { Tree, getWorkspacePath, getProjects } from '@nrwl/devkit';
import { resolve } from 'path';
import { ApplicationType, getApplicationType } from './application-type';

export function getPulumiBinaryPath(host: Tree) {
  return resolve(getWorkspacePath(host), 'node_modules/.bin/pulumi');
}

export function getApplications(
  host: Tree
): { projectName: string; applicationType: ApplicationType }[] {
  const projects = getProjects(host);
  const applications: {
    projectName: string;
    applicationType: ApplicationType;
  }[] = [];

  projects.forEach((config, projectName) => {
    const applicationType = getApplicationType(config.targets, host);
    if (applicationType) {
      applications.push({
        projectName,
        applicationType,
      });
    }
  });

  return applications;
}
