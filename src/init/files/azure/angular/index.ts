import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import { StorageStaticWebsite } from './static-website.resource';
import { StorageSyncResource } from './storage-sync.resource';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY NG-DEPLOY-UNIVERSAL ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath'),
  useCdn: stackConfig.getBoolean('useCdn')
  // ===== END ======
};
const projectName = config.projectName;

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
const staticWebsiteResource = new StorageStaticWebsite(`static`, {
  accountName: storageAccount.name
});

// Sync the contents of the source directory with the azure blob storage, which will in-turn show up on the CDN.
const syncFiles = new StorageSyncResource('sync', {
  accountName: storageAccount.name,
  distPath: config.distPath,
  blobContainer: staticWebsiteResource.webContainerName
});

let cdnEndpointResource: azure.cdn.Endpoint;
if (config.useCdn) {
  // Optionally, we can add a CDN in front of the website
  const cdn = new azure.cdn.Profile(`pr-cdn`, {
    resourceGroupName: resourceGroup.name,
    sku: 'Standard_Microsoft'
  });

  cdnEndpointResource = new azure.cdn.Endpoint(`cdn-ep`, {
    resourceGroupName: resourceGroup.name,
    profileName: cdn.name,
    originHostHeader: staticWebsiteResource.hostName,
    origins: [
      {
        name: 'blobstorage',
        hostName: staticWebsiteResource.hostName
      }
    ]
  });
}

export const staticEndpoint = staticWebsiteResource.endpoint;
export const cdnEndpoint =
  cdnEndpointResource &&
  pulumi.interpolate`https://${cdnEndpointResource.hostName}/`;
