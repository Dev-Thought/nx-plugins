export enum PROVIDER {
  AWS = 'aws',
  AZURE = 'azure',
  GOOGLE_CLOUD_PLATFORM = 'gcp',
}

export function getCloudTemplateName(cloudProvider: string): string {
  return `${cloudProvider}-typescript`;
}
