import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { Distribution } from '@pulumi/aws/cloudfront';
import { Output } from '@pulumi/pulumi';
import * as mime from 'mime';

import { createCdn } from './cdn';
import { createCertificate } from './certificate';
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
crawlDirectory(config.distPath, (filePath: string) => {
  const relativeFilePath = filePath.replace(config.distPath + '/', '');
  const contentFile = new aws.s3.BucketObject(
    relativeFilePath,
    {
      key: relativeFilePath,

      acl: 'public-read',
      bucket: contentBucket,
      contentType: mime.getType(filePath) || undefined,
      source: new pulumi.asset.FileAsset(filePath)
    },
    {
      parent: contentBucket
    }
  );
});

let cdn: Distribution;
if (config.useCdn) {
  let certificateArn: Output<string>;
  if (config.customDomainName) {
    certificateArn = createCertificate(config.customDomainName);
  }

  cdn = createCdn(config, contentBucket, certificateArn);
}

// Export properties from this stack. This prints them at the end of `pulumi up` and
// makes them easier to access from the pulumi.com.
export const staticEndpoint = contentBucket.websiteEndpoint;
export const cdnEndpoint = cdn && cdn.domainName;
export const cdnCustomDomain =
  config.customDomainName &&
  pulumi.interpolate`https://${config.customDomainName}`;
