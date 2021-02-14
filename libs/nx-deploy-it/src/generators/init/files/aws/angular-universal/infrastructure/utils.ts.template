import { Distribution } from '@pulumi/aws/cloudfront';
import { Record } from '@pulumi/aws/route53';
import { route53 } from '@pulumi/aws';
import { readdirSync, statSync } from 'fs';

export function getDomainAndSubdomain(
  domain: string
): { subdomain: string; parentDomain: string } {
  const parts = domain.split('.');
  if (parts.length < 2) {
    throw new Error(`No TLD found on ${domain}`);
  }
  if (parts.length === 2) {
    return { subdomain: '', parentDomain: domain };
  }

  const subdomain = parts[0];
  parts.shift();
  return {
    subdomain,
    // Trailing "." to canonicalize domain.
    parentDomain: parts.join('.') + '.'
  };
}

// Creates a new Route53 DNS record pointing the domain to the CloudFront distribution.
export function createAliasRecord(
  targetDomain: string,
  distribution: Distribution
): Record {
  const domainParts = getDomainAndSubdomain(targetDomain);
  const hostedZoneId = route53
    .getZone({ name: domainParts.parentDomain }, { async: true })
    .then(zone => zone.zoneId);
  return new Record(targetDomain, {
    name: domainParts.subdomain,
    zoneId: hostedZoneId,
    type: 'A',
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: true
      }
    ]
  });
}

export function crawlDirectory(dir: string, f: (_: string) => void) {
  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = `${dir}/${file}`;
    const stat = statSync(filePath);
    if (stat.isDirectory()) {
      crawlDirectory(filePath, f);
    }
    if (stat.isFile()) {
      f(filePath);
    }
  }
}
