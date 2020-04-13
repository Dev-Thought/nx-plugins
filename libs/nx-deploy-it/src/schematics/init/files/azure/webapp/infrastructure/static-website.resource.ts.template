import * as pulumi from '@pulumi/pulumi';

const ACCOUNT_NAME_PROP = 'accountName';

export interface StorageStaticWebsiteArgs {
  [ACCOUNT_NAME_PROP]: pulumi.Input<string>;
}

// There's currently no way to enable the Static Web Site feature of a storage account via ARM
// Therefore, we created a custom provider which wraps corresponding Azure CLI commands
class StorageStaticWebsiteProvider implements pulumi.dynamic.ResourceProvider {
  public async check(
    olds: any,
    news: any
  ): Promise<pulumi.dynamic.CheckResult> {
    const failures = [];

    if (news[ACCOUNT_NAME_PROP] === undefined) {
      failures.push({
        property: ACCOUNT_NAME_PROP,
        reason: `required property '${ACCOUNT_NAME_PROP}' missing`
      });
    }

    return { inputs: news, failures };
  }

  public async diff(
    id: pulumi.ID,
    olds: any,
    news: any
  ): Promise<pulumi.dynamic.DiffResult> {
    const replaces = [];

    if (olds[ACCOUNT_NAME_PROP] !== news[ACCOUNT_NAME_PROP]) {
      replaces.push(ACCOUNT_NAME_PROP);
    }

    return { replaces };
  }

  public async create(inputs: any): Promise<pulumi.dynamic.CreateResult> {
    const { execSync } = require('child_process');
    const url = require('url');
    const accountName = inputs[ACCOUNT_NAME_PROP];

    // Helper function to execute a command, supress the warnings from polluting the output, and parse the result as JSON
    const executeToJson = (command: string) =>
      JSON.parse(
        execSync(command, { stdio: ['pipe', 'pipe', 'ignore'] }).toString()
      );

    // Install Azure CLI extension for storage (currently, only the preview version has the one we need)
    execSync('az extension add --name storage-preview', { stdio: 'ignore' });

    // Update the service properties of the storage account to enable static website and validate the result
    const update = executeToJson(
      `az storage blob service-properties update --account-name "${accountName}" --static-website --404-document index.html`
    );
    if (!update.staticWebsite.enabled) {
      throw new Error(`Static website update failed: ${update}`);
    }

    return {
      id: `${accountName}StaticWebsite`
    };
  }
}

export class StorageStaticWebsite extends pulumi.dynamic.Resource {
  public readonly endpoint: pulumi.Output<string>;
  public readonly hostName: pulumi.Output<string>;
  public readonly webContainerName: pulumi.Output<string>;

  constructor(
    name: string,
    args: StorageStaticWebsiteArgs,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new StorageStaticWebsiteProvider(),
      name,
      {
        ...args,
        endpoint: undefined,
        hostName: undefined,
        webContainerName: undefined
      },
      opts
    );
  }
}
