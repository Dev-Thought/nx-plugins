import * as aws from '@pulumi/aws';

import { Output } from '@pulumi/pulumi';
import { Bucket } from '@pulumi/aws/s3';
import { Distribution } from '@pulumi/aws/cloudfront';
import { createAliasRecord } from './utils';

export function createCdn(
  config: any,
  contentBucket: Bucket,
  certificateArn?: Output<string>
): Distribution {
  // logsBucket is an S3 bucket that will contain the CDN's request logs.
  const logsBucket = new Bucket(`${config.projectName}-requestLogs`, {
    acl: 'private',
    forceDestroy: true
  });

  const tenMinutes = 60 * 10;

  // distributionArgs configures the CloudFront distribution. Relevant documentation:
  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
  // https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
  const distributionArgs: aws.cloudfront.DistributionArgs = {
    enabled: true,
    // Alternate aliases the CloudFront distribution can be reached at, in addition to https://xxxx.cloudfront.net.
    // Required if you want to access the distribution via config.customDomainName as well.
    aliases: config.customDomainName ? [config.customDomainName] : undefined,

    // We only specify one origin for this distribution, the S3 content bucket.
    origins: [
      {
        originId: contentBucket.arn,
        domainName: contentBucket.websiteEndpoint,
        customOriginConfig: {
          // Amazon S3 doesn't support HTTPS connections when using an S3 bucket configured as a website endpoint.
          // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginProtocolPolicy
          originProtocolPolicy: 'http-only',
          httpPort: 80,
          httpsPort: 443,
          originSslProtocols: ['TLSv1.2']
        }
      }
    ],

    defaultRootObject: 'index.html',

    // A CloudFront distribution can configure different cache behaviors based on the request path.
    // Here we just specify a single, default cache behavior which is just read-only requests to S3.
    defaultCacheBehavior: {
      targetOriginId: contentBucket.arn,

      viewerProtocolPolicy: 'redirect-to-https',
      allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      cachedMethods: ['GET', 'HEAD', 'OPTIONS'],

      forwardedValues: {
        cookies: { forward: 'none' },
        queryString: false
      },

      minTtl: 0,
      defaultTtl: tenMinutes,
      maxTtl: tenMinutes
    },

    // "All" is the most broad distribution, and also the most expensive.
    // "100" is the least broad, and also the least expensive.
    priceClass: 'PriceClass_100',

    // You can customize error responses. When CloudFront recieves an error from the origin (e.g. S3 or some other
    // web service) it can return a different error code, and return the response for a different resource.
    customErrorResponses: [
      { errorCode: 404, responseCode: 200, responsePagePath: '/index.html' }
    ],

    restrictions: {
      geoRestriction: {
        restrictionType: 'none'
      }
    },

    viewerCertificate: {
      acmCertificateArn: certificateArn, // Per AWS, ACM certificate must be in the us-east-1 region.
      cloudfrontDefaultCertificate: certificateArn ? false : true,
      sslSupportMethod: 'sni-only'
    },

    loggingConfig: {
      bucket: logsBucket.bucketDomainName,
      includeCookies: false,
      prefix: config.customDomainName ? `${config.customDomainName}/` : ''
    }
  };

  const cdn = new Distribution(`${config.projectName}-cdn`, distributionArgs);

  if (config.customDomainName) {
    const aliasRecord = createAliasRecord(config.customDomainName, cdn);
  }

  return cdn;
}
