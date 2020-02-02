import {
  ResourceProvider,
  CheckResult,
  DiffResult,
  CreateResult,
  UpdateResult,
  Resource
} from '@pulumi/pulumi/dynamic';
import { ID, Input, CustomResourceOptions } from '@pulumi/pulumi';
import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';

class S3SyncProvider implements ResourceProvider {
  public async check(
    olds: S3SyncProviderArgs,
    news: S3SyncProviderArgs
  ): Promise<CheckResult> {
    const failures = [];

    if (news.bucketPath === undefined) {
      failures.push({
        property: 'bucketPath',
        reason: `required property 'bucketPath' missing`
      });
    }

    if (news.distPath === undefined) {
      failures.push({
        property: 'distPath',
        reason: `required property 'distPath' missing`
      });
    }

    return { inputs: news, failures };
  }
  public async diff(id: ID, olds: any, news: any): Promise<DiffResult> {
    let changes = false;

    const hashSum = createSum(news.distPath.toString());

    if (olds.hashSum !== hashSum) {
      changes = true;
    }

    return { changes };
  }
  public async create(inputs: S3SyncProviderArgs): Promise<CreateResult> {
    const bucketPath = inputs.bucketPath;
    const distPath = inputs.distPath;

    execSync(`aws s3 sync ${distPath} s3://${bucketPath} --acl public-read`);

    const hashSum = createSum(distPath.toString());

    return {
      id: `${bucketPath}SyncFiles`,
      outs: {
        hashSum
      }
    };
  }
  public async update(
    id: ID,
    olds: S3SyncProviderArgs,
    news: S3SyncProviderArgs
  ): Promise<UpdateResult> {
    const bucketPath = news.bucketPath;
    const distPath = news.distPath;

    execSync(`aws s3 sync ${distPath} s3://${bucketPath} --acl public-read`);

    const hashSum = createSum(distPath.toString());

    return {
      outs: {
        hashSum
      }
    };
  }
}

export class S3SyncResource extends Resource {
  constructor(
    name: string,
    args: S3SyncProviderArgs,
    opts?: CustomResourceOptions
  ) {
    super(new S3SyncProvider(), name, args, opts);
  }
}

export interface S3SyncProviderArgs {
  bucketPath: Input<string>;
  distPath: Input<string>;
}

// crawlDirectory recursive crawls the provided directory, applying the provided function
// to every file it contains. Doesn't handle cycles from symlinks.
function crawlDirectory(dir: string, f: (_: string) => void) {
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

function createSum(distPath: string) {
  let hashSum = '';
  crawlDirectory(distPath, (filePath: string) => {
    hashSum += checksum(readFileSync(filePath).toString());
  });
  hashSum = checksum(hashSum);
  return hashSum;
}

function checksum(str: string) {
  return createHash('sha1')
    .update(str, 'utf8')
    .digest('hex');
}
