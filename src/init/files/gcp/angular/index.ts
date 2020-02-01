import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';

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

const contentBucket = new gcp.storage.Bucket(`${projectName}-contentBucket`, {
  website: {
    mainPageSuffix: 'index.html',
    notFoundPage: 'index.html'
  }
});
