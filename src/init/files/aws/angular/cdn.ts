import * as aws from '@pulumi/aws';

import { Input } from '@pulumi/pulumi';
import { Bucket } from '@pulumi/aws/s3';
import { Distribution } from '@pulumi/aws/cloudfront';
import { Provider } from '@pulumi/aws';

export function createCdn(config: any, contentBucket: Bucket): Distribution {
  // logsBucket is an S3 bucket that will contain the CDN's request logs.
  const logsBucket = new Bucket(`${config.projectName}-requestLogs`, {
    acl: 'private',
    forceDestroy: true
  });

  const tenMinutes = 60 * 10;

  let certificateArn: Input<string> = config.certificateArn;

  /**
   * Only provision a certificate (and related resources) if a certificateArn is _not_ provided via configuration.
   */
  if (config.certificateArn === undefined && config.targetDomain) {
    const eastRegion = new Provider('east', {
      profile: aws.config.profile,
      region: 'us-east-1' // Per AWS, ACM certificate must be in the us-east-1 region.
    });

    const certificate = new aws.acm.Certificate(
      'certificate',
      {
        domainName: config.targetDomain,
        validationMethod: 'DNS'
      },
      { provider: eastRegion }
    );

    const domainParts = getDomainAndSubdomain(config.targetDomain);
    const hostedZoneId = aws.route53
      .getZone({ name: domainParts.parentDomain }, { async: true })
      .then(zone => zone.zoneId);

    /**
     *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
     *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
     */
    const certificateValidationDomain = new aws.route53.Record(
      `${config.targetDomain}-validation`,
      {
        name: certificate.domainValidationOptions[0].resourceRecordName,
        zoneId: hostedZoneId,
        type: certificate.domainValidationOptions[0].resourceRecordType,
        records: [certificate.domainValidationOptions[0].resourceRecordValue],
        ttl: tenMinutes
      }
    );

    /**
     * This is a _special_ resource that waits for ACM to complete validation via the DNS record
     * checking for a status of "ISSUED" on the certificate itself. No actual resources are
     * created (or updated or deleted).
     *
     * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
     * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
     * for the actual implementation.
     */
    const certificateValidation = new aws.acm.CertificateValidation(
      'certificateValidation',
      {
        certificateArn: certificate.arn,
        validationRecordFqdns: [certificateValidationDomain.fqdn]
      },
      { provider: eastRegion }
    );

    certificateArn = certificateValidation.certificateArn;
  }

  // distributionArgs configures the CloudFront distribution. Relevant documentation:
  // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
  // https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
  const distributionArgs: aws.cloudfront.DistributionArgs = {
    enabled: true,
    // Alternate aliases the CloudFront distribution can be reached at, in addition to https://xxxx.cloudfront.net.
    // Required if you want to access the distribution via config.targetDomain as well.
    aliases: config.targetDomain ? [config.targetDomain] : undefined,

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
      { errorCode: 404, responseCode: 404, responsePagePath: '/index.html' }
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
      prefix: config.targetDomain ? `${config.targetDomain}/` : ''
    }
  };

  const cdn = new Distribution(`${config.projectName}-cdn`, distributionArgs);

  return cdn;
}

// Split a domain name into its subdomain and parent domain names.
// e.g. "www.example.com" => "www", "example.com".
function getDomainAndSubdomain(
  domain: string
): { subdomain: string; parentDomain: string } {
  const parts = domain.split('.');
  if (parts.length < 2) {
    throw new Error(`No TLD found on ${domain}`);
  }
  // No subdomain, e.g. awesome-website.com.
  if (parts.length === 2) {
    return { subdomain: '', parentDomain: domain };
  }

  const subdomain = parts[0];
  parts.shift(); // Drop first element.
  return {
    subdomain,
    // Trailing "." to canonicalize domain.
    parentDomain: parts.join('.') + '.'
  };
}

// Creates a new Route53 DNS record pointing the domain to the CloudFront distribution.
// function createAliasRecord(
//   targetDomain: string,
//   distribution: aws.cloudfront.Distribution
// ): aws.route53.Record {
//   const domainParts = getDomainAndSubdomain(targetDomain);
//   const hostedZoneId = aws.route53
//     .getZone({ name: domainParts.parentDomain }, { async: true })
//     .then(zone => zone.zoneId);
//   return new aws.route53.Record(targetDomain, {
//     name: domainParts.subdomain,
//     zoneId: hostedZoneId,
//     type: 'A',
//     aliases: [
//       {
//         name: distribution.domainName,
//         zoneId: distribution.hostedZoneId,
//         evaluateTargetHealth: true
//       }
//     ]
//   });
// }

// if (config.targetDomain) {
//   const aRecord = createAliasRecord(config.targetDomain, cdn);
// }
