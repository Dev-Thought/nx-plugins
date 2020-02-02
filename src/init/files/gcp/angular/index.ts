import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY NG-DEPLOY-UNIVERSAL ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath'),
  useCdn: stackConfig.getBoolean('useCdn')
  // ===== END ======
};
const projectName = config.projectName;

const contentBucket = new gcp.storage.Bucket(`${projectName}-contentBucket`, {
  website: {
    mainPageSuffix: 'index.html',
    notFoundPage: 'index.html'
  }
});
