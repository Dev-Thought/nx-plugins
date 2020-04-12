import { PROVIDER } from './provider';
import { ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE } from '../adapter/angular-universal/deployment-type.enum';

export const QUESTIONS = {
  // get list with: aws ec2 describe-regions --profile cli-dev-thought | jq ".Regions[] | .RegionName"
  awsRegion: {
    type: 'autocomplete',
    name: 'aws:region',
    message: 'The AWS region to deploy into:',
    limit: 10,
    choices: [
      'eu-north-1',
      'ap-south-1',
      'eu-west-3',
      'eu-west-2',
      'eu-west-1',
      'ap-northeast-2',
      'ap-northeast-1',
      'sa-east-1',
      'ca-central-1',
      'ap-southeast-1',
      'ap-southeast-2',
      'eu-central-1',
      'us-east-1',
      'us-east-2',
      'us-west-1',
      'us-west-2',

      'ap-east-1',
      'ap-northeast-3',
      'me-south-1'
    ]
  },

  // https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations/list
  gcpRegionCloudFunctions: {
    type: 'autocomplete',
    name: 'gcp:region',
    message: 'The GCP region to deploy into:',
    limit: 10,
    choices: [
      'europe-west2',
      'europe-west1',
      'europe-west3',
      'us-east4',
      'us-central1',
      'us-east1',
      'asia-east2',
      'asia-northeast1'
    ]
  },

  gcpProjectId: {
    type: 'input',
    name: 'gcp:project',
    message: 'Your google project ID where all the resources will be deployed'
  },

  // get list with: az account list-locations | jq ".[] | .name"
  azureLocation: {
    type: 'autocomplete',
    name: 'azure:location',
    message: 'The Azure location to deploy into:',
    limit: 10,
    choices: [
      'eastasia',
      'southeastasia',
      'centralus',
      'eastus',
      'eastus2',
      'westus',
      'northcentralus',
      'southcentralus',
      'northeurope',
      'westeurope',
      'japanwest',
      'japaneast',
      'brazilsouth',
      'australiaeast',
      'australiasoutheast',
      'southindia',
      'centralindia',
      'westindia',
      'canadacentral',
      'canadaeast',
      'uksouth',
      'ukwest',
      'westcentralus',
      'westus2',
      'koreacentral',
      'koreasouth',
      'francecentral',
      'francesouth',
      'australiacentral',
      'australiacentral2',
      'uaecentral',
      'uaenorth',
      'southafricanorth',
      'southafricawest',
      'switzerlandnorth',
      'switzerlandwest',
      'germanynorth',
      'germanywestcentral',
      'norwaywest',
      'norwayeast'
    ]
  },

  customDomainName: {
    type: 'input',
    name: 'customDomainName',
    message:
      'GCP requires a customDomainName which needs to be set up by you. Find more in the documentation.',
    initial: 'www.example.com'
  },

  awsProfile: {
    type: 'input',
    name: 'aws:profile',
    message:
      'Do you want to use a specific aws profile? Just skip if you want to use the default one.'
  },

  setupApplications: {
    type: 'MultiSelect',
    name: 'setupApplications',
    message:
      "Please select the applications you want to setup. If you don't select one, you will skip this process and you can do it later again."
  },

  whichProvider: {
    type: 'select',
    name: 'provider',
    choices: [
      { name: 'AWS', value: PROVIDER.AWS },
      { name: 'Azure', value: PROVIDER.AZURE },
      { name: 'Google Cloud Platform', value: PROVIDER.GOOGLE_CLOUD_PLATFORM }
    ],
    result: function(r: string) {
      return Object.values(this.map(r))[0];
    }
  } as any,

  angularUniversal: {
    type: 'select',
    name: 'angularUniversalDeploymentType',
    message: 'Please select the deployment type of angular universal.',
    choices: [
      {
        name: 'Prerendering',
        value: ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE.PRERENDERING
      },
      {
        name: 'Server Side Rendering',
        value: ANGULAR_UNIVERSAL_DEPLOYMENT_TYPE.SERVER_SIDE_RENDERING
      }
    ],
    result: function(r: string) {
      return Object.values(this.map(r))[0];
    }
  }
};
