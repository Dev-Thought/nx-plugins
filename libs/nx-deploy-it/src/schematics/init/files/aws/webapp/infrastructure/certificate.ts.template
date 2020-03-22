import { Provider, config, route53 } from '@pulumi/aws';
import { Certificate, CertificateValidation } from '@pulumi/aws/acm';
import { Record } from '@pulumi/aws/route53';
import { Output } from '@pulumi/pulumi';
import { getDomainAndSubdomain } from './utils';

export function createCertificate(customDomainName: string): Output<string> {
  const tenMinutes = 60 * 10;

  const eastRegion = new Provider('east', {
    region: 'us-east-1', // Per AWS, ACM certificate must be in the us-east-1 region.
    profile: config.profile
  });

  const certificate = new Certificate(
    'certificate',
    {
      domainName: customDomainName,
      validationMethod: 'DNS'
    },
    { provider: eastRegion }
  );

  const domainParts = getDomainAndSubdomain(customDomainName);
  const zoneId = route53
    .getZone({ name: domainParts.parentDomain }, { async: true })
    .then(zone => zone.zoneId);

  // /**
  //  *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
  //  *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
  //  */
  const certificateValidationDomain = new Record(
    `${customDomainName}-validation`,
    {
      name: certificate.domainValidationOptions[0].resourceRecordName,
      zoneId,
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
  const certificateValidation = new CertificateValidation(
    'certificateValidation',
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [certificateValidationDomain.fqdn]
    },
    { provider: eastRegion, parent: certificate }
  );

  return certificateValidation.certificateArn;
}
