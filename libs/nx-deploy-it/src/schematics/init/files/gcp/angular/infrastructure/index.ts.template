import * as gcp from '@pulumi/gcp';
import * as pulumi from '@pulumi/pulumi';
import { readdirSync, statSync } from 'fs';
import * as mime from 'mime';
import { basename } from 'path';
import { interpolate } from '@pulumi/pulumi';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY nx-deploy-it ======
  projectName: stackConfig.get('projectName'),
  distPath: stackConfig.get('distPath'),
  useCdn: stackConfig.getBoolean('useCdn'),
  customDomainName: stackConfig.require('customDomainName')
  // ===== END ======
};
const projectName = config.projectName;

const contentBucket = new gcp.storage.Bucket('contentBucket', {
  name: config.customDomainName,
  website: {
    mainPageSuffix: 'index.html',
    notFoundPage: 'index.html'
  },
  forceDestroy: true
});

const oacResource = new gcp.storage.DefaultObjectAccessControl(
  `${projectName}-storage-oac`,
  {
    bucket: contentBucket.name,
    entity: 'allUsers',
    role: 'READER'
  }
);

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

// Sync the contents of the source directory with the GCP bucket.
crawlDirectory(config.distPath, (filePath: string) => {
  const relativeFilePath = filePath.replace(config.distPath + '/', '');
  const file = new gcp.storage.BucketObject(
    relativeFilePath,
    {
      bucket: contentBucket.name,
      source: new pulumi.asset.FileAsset(filePath),
      name: basename(relativeFilePath),
      contentType: mime.getType(filePath) || undefined
    },
    { dependsOn: oacResource }
  );
});

if (config.useCdn) {
  const cdnEndpointResource = new gcp.compute.BackendBucket(
    `${projectName}-cbb`,
    {
      bucketName: contentBucket.name,
      enableCdn: true
    }
  );
}

export const endpoint = interpolate`https://${config.customDomainName}`;
