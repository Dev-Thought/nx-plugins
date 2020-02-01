import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import { StorageStaticWebsite } from './static-website.resource';
import { join } from 'path';
import { StorageSyncResource } from './storage-sync.resource';

const projectName = '<%= projectName %>';
const stackConfig = new pulumi.Config();
const config = {
  // pathToWebsiteContents is a relativepath to the website's contents.
  pathToWebsiteContents: '<%= buildPath %>',
  // (Optional) targetDomain is the domain/host to serve content at.
  targetDomain: stackConfig.get('targetDomain'),
  // (Optional) ACM certificate ARN for the target domain; must be in the us-east-1 region. If omitted, an ACM certificate will be created.
  certificateArn: stackConfig.get('certificateArn')
};

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup(`${projectName}-rg`);

// Create a Storage Account for our static website
const storageAccount = new azure.storage.Account(`account`, {
  resourceGroupName: resourceGroup.name,
  accountReplicationType: 'LRS',
  accountTier: 'Standard',
  accountKind: 'StorageV2'
});

// There's currently no way to enable the Static Web Site feature of a storage account via ARM
// Therefore, we created a custom resource which wraps corresponding Azure CLI commands
const staticWebsite = new StorageStaticWebsite(`static`, {
  accountName: storageAccount.name
});

// Sync the contents of the source directory with the azure blob storage, which will in-turn show up on the CDN.
const webContentsRootPath = join(process.cwd(), config.pathToWebsiteContents);

const syncFiles = new StorageSyncResource('sync', {
  accountName: storageAccount.name,
  distPath: webContentsRootPath,
  blobContainer: staticWebsite.webContainerName
});

// Web endpoint to the website
export const staticEndpoint = staticWebsite.endpoint;

let endpoint: azure.cdn.Endpoint;
if (config.targetDomain) {
  // Optionally, we can add a CDN in front of the website
  const cdn = new azure.cdn.Profile(`pr-cdn`, {
    resourceGroupName: resourceGroup.name,
    sku: 'Standard_Microsoft'
  });

  endpoint = new azure.cdn.Endpoint(`cdn-ep`, {
    resourceGroupName: resourceGroup.name,
    profileName: cdn.name,
    originHostHeader: staticWebsite.hostName,
    origins: [
      {
        name: 'blobstorage',
        hostName: staticWebsite.hostName
      }
    ]
  });
}

// CDN endpoint to the website.
// Allow it some time after the deployment to get ready.
export const cdnEndpoint = endpoint
  ? pulumi.interpolate`https://${endpoint.hostName}/`
  : undefined;
