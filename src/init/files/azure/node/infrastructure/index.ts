import * as azure from '@pulumi/azure';
import * as pulumi from '@pulumi/pulumi';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY ng-deploy-it ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath')
  // ===== END ======
};
const projectName = config.projectName;

const resourceGroup = new azure.core.ResourceGroup(`${projectName}-rg`);

const nodeApp = new azure.appservice.ArchiveFunctionApp(
  `${projectName}-functions`,
  {
    resourceGroup,
    archive: new pulumi.asset.FileArchive('./functions')
  }
);

export const nodeEndpoint = nodeApp.endpoint;
