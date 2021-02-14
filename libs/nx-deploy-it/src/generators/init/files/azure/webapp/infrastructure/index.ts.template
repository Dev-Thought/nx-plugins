import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';
import * as mime from 'mime';

import { StorageStaticWebsite } from './static-website.resource';
import { CDNCustomDomainResource } from './cdnCustomDomain';
import { crawlDirectory } from './utils';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY nx-deploy-it ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath'),
  useCdn: stackConfig.getBoolean('useCdn'),
  customDomainName: stackConfig.get('customDomainName')
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
  accountKind: 'StorageV2',
  staticWebsite: {
    indexDocument: 'index.html'
  }
});

// There's currently a bug in to enable the Static Web Site feature of a storage account via ARM
// Therefore, we created a custom resource which wraps corresponding Azure CLI commands
const storageStaticWebsite = new StorageStaticWebsite(`static`, {
  accountName: storageAccount.name
});

crawlDirectory(config.distPath, (filePath: string) => {
  const relativeFilePath = filePath.replace(config.distPath + '/', '');
  const contentFile = new azure.storage.Blob(relativeFilePath, {
    name: relativeFilePath,
    storageAccountName: storageAccount.name,
    storageContainerName: '$web',
    type: 'Block',
    source: new pulumi.asset.FileAsset(filePath),
    contentType: mime.getType(filePath) || undefined
  });
});

let cdnEndpointResource: azure.cdn.Endpoint;
let cdnCustomDomainResource: CDNCustomDomainResource;
if (config.useCdn) {
  const cdnProfile = new azure.cdn.Profile(`pr-cdn`, {
    resourceGroupName: resourceGroup.name,
    sku: 'Standard_Microsoft'
  });

  cdnEndpointResource = new azure.cdn.Endpoint(`cdn-ep`, {
    // TODO: handle long custom domains max characters 50
    name:
      (config.customDomainName &&
        config.customDomainName.replace(/\./gi, '-')) ||
      undefined,
    resourceGroupName: resourceGroup.name,
    profileName: cdnProfile.name,
    originHostHeader: storageAccount.primaryWebHost,
    origins: [
      {
        name: 'blobstorage',
        hostName: storageAccount.primaryWebHost
      }
    ]
  });

  if (config.customDomainName) {
    cdnCustomDomainResource = new CDNCustomDomainResource(
      'cdnCustomDomain',
      {
        resourceGroupName: resourceGroup.name,
        // Ensure that there is a CNAME record for mycompany.com pointing to my-cdn-endpoint.azureedge.net.
        // You would do that in your domain registrar's portal.
        customDomainHostName: config.customDomainName,
        profileName: cdnProfile.name,
        endpointName: cdnEndpointResource.name,
        /**
         * This will enable HTTPS through Azure's one-click
         * automated certificate deployment. The certificate is
         * fully managed by Azure from provisioning to automatic renewal
         * at no additional cost to you.
         */
        httpsEnabled: true
      },
      { parent: cdnEndpointResource }
    );
  }
}

export const staticEndpoint =
  storageAccount && storageAccount.primaryWebEndpoint;
export const cdnEndpoint =
  cdnEndpointResource &&
  pulumi.interpolate`https://${cdnEndpointResource.hostName}/`;
export const cdnCustomDomain =
  cdnCustomDomainResource &&
  pulumi.interpolate`https://${config.customDomainName}`;
