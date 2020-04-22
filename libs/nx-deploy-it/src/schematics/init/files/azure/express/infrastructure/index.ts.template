import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY nx-deploy-it ======
  projectName: stackConfig.get('projectName')
  // ===== END ======
};
const projectName = config.projectName;

const resourceGroup = new azure.core.ResourceGroup(`${projectName}-rg`);

const nodeApp = new azure.appservice.ArchiveFunctionApp(
  `${projectName}-functions`,
  {
    resourceGroup,
    archive: new pulumi.asset.FileArchive('./functions'),
    version: '~3',
    nodeVersion: '~10',
    siteConfig: {
      cors: { allowedOrigins: ['*'] }
    }
  }
);

export const nodeEndpoint = nodeApp.endpoint.apply((endpoint: string) =>
  endpoint.replace(/api\/$/, '')
);
