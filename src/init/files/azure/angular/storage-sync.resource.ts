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

class StorageSyncProvider implements ResourceProvider {
  public async check(
    olds: StorageSyncProviderArgs,
    news: StorageSyncProviderArgs
  ): Promise<CheckResult> {
    const failures = [];

    if (news.accountName === undefined) {
      failures.push({
        property: 'accountName',
        reason: `required property 'accountName' missing`
      });
    }

    if (news.blobContainer === undefined) {
      failures.push({
        property: 'blobContainer',
        reason: `required property 'blobContainer' missing`
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
  public async create(inputs: StorageSyncProviderArgs): Promise<CreateResult> {
    const accountName = inputs.accountName;
    const container = inputs.blobContainer;
    const distPath = inputs.distPath;

    execSync(
      `az storage blob sync -c '${container}' --account-name "${accountName}" -s ${distPath}`
    );

    const hashSum = createSum(distPath.toString());

    return {
      id: `${accountName}SyncFiles`,
      outs: {
        hashSum
      }
    };
  }
  public async update(
    id: ID,
    olds: StorageSyncProviderArgs,
    news: StorageSyncProviderArgs
  ): Promise<UpdateResult> {
    const accountName = news.accountName;
    const container = news.blobContainer;
    const distPath = news.distPath;

    execSync(
      `az storage blob sync -c '${container}' --account-name "${accountName}" -s ${distPath}`
    );

    const hashSum = createSum(distPath.toString());

    return {
      outs: {
        hashSum
      }
    };
  }
}

export class StorageSyncResource extends Resource {
  constructor(
    name: string,
    args: StorageSyncProviderArgs,
    opts?: CustomResourceOptions
  ) {
    super(new StorageSyncProvider(), name, args, opts);
  }
}

export interface StorageSyncProviderArgs {
  accountName: Input<string>;
  blobContainer: Input<string>;
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
