export enum PROVIDER {
  AWS = 'aws',
  AZURE = 'azure',
  GOOGLE_CLOUD_PROVIDER = 'gcp'
}

export function getCloudTemplateName(cloudProvider: string) {
  return `${cloudProvider}-typescript`;
}
