import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

import { S3SyncResource } from './s3-sync.resource';
import { createCdn } from './cdn';
import { Distribution } from '@pulumi/aws/cloudfront';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY NG-DEPLOY-UNIVERSAL ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath'),
  useCdn: stackConfig.getBoolean('useCdn')
  // ===== END ======
};
const projectName = config.projectName;

// contentBucket is the S3 bucket that the website's contents will be stored in.
const contentBucket = new aws.s3.Bucket(`${projectName}-contentBucket`, {
  acl: 'public-read',
  // Configure S3 to serve bucket contents as a website. This way S3 will automatically convert
  // requests for "foo/" to "foo/index.html".
  website: {
    indexDocument: 'index.html',
    errorDocument: 'index.html'
  },
  forceDestroy: true
});

// Sync the contents of the source directory with the S3 bucket, which will in-turn show up on the CDN.
const s3Sync = new S3SyncResource(`${projectName}-s3-sync`, {
  bucketPath: contentBucket.bucket,
  distPath: config.distPath
});

let cdn: Distribution;
if (config.useCdn) {
  cdn = createCdn(config, contentBucket);
}

// Export properties from this stack. This prints them at the end of `pulumi up` and
// makes them easier to access from the pulumi.com.
export const staticEndpoint = contentBucket.websiteEndpoint;
export const cdnEndpoint = cdn && cdn.domainName;
