# @dev-thought/ng-deploy-universal

[![npm version](https://badge.fury.io/js/%40dev-thought%2Fng-deploy-universal.svg)](https://www.npmjs.com/package/@dev-thought/ng-deploy-universal)
[![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?color=blue&style=flat-square)](http://opensource.org/licenses/MIT)

**Deploy applications in nx / angular workspaces to the cloud using a provider of your Choice (Azure, AWS, Google Cloud Platform)**

We are using under the hood the code as infrastructure tool [Pulumi](https://www.pulumi.com/). It gives you the possibility to have every piece of code under your control. You can extend it for your requirements (VPN, ...) and still able to use the schematics for deployment.

## Quick-start <a name="quickstart"></a>

1. Create a new project with the angular cli (>= 8.3.0) or nx cli.

   ```sh
   npm install -g @angular/cli
   ng new hello-world --defaults
   cd hello-world
   ```

1. Add `ng-deploy-universal` to your project.

   ```sh
   ng add @dev-thought/ng-deploy-universal
   ```

1. Switch to local state management.

   ```sh
   npx pulumi login --local
   ```

1. Initialize the infrastructure as code for your project.

   ```sh
   ng g @dev-thought/ng-deploy-universal:init
   ```

1. You may be prompted to answer some questions for the setup.

1. Deploy your project to your cloud provider.

   ```sh
   ng run hello-world:deploy
   ```

   The project will be built with the development configuration.
   In development you will be asked to confirm the changes of your infrastructure

1. Everything is done and you want to remove your whole infrastructure. No problem ;) Just do it with

   ```sh
   ng run hello-world:destroy
   ```
   
## Requirements

You will need the Angular CLI, an Angular project, and an Azure Subscription to deploy to Azure. Details of these requirements are in this section.

## :bangbang: Cloud provider setup

ng-deploy-universal is only working with already configured cloud providers. If you need to know how to set up them, please follow the first steps in the [Pulumi Quickstart](https://www.pulumi.com/docs/get-started/) for your provider.

## Infrastructure as code and their state

As many things in development, infrastructure as code needs to hold a state somewhere. This is how the tools can check if something has changed and to do only updates where it is necessary. Pulumi provides different ways to hold the state.
The simplest way at the beginning is to hold it local. It's perfect for your local development. Since you want to share it with multiple colleagues or to feel better if it is not only on your disk, you might think about a persistent solution in the cloud with your provider, which you can choose here or with Pulumi self. You can read more about it [here](https://www.pulumi.com/docs/reference/cli/pulumi_login/).
ng-deploy-universal installs pulumi as binary in your node_modules folder so you can use it with `npx` easy.

### Azure

If you don't have an Azure subscription, [create your Azure free account from this link](https://azure.microsoft.com/en-us/free/?WT.mc_id=ng_deploy_azure-github-cxa).
https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/

### AWS

https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/

### Google cloud platform

https://www.pulumi.com/docs/intro/cloud-providers/gcp/setup/

## Application / Feature Lists

Legend

- :white_check_mark: is implemented
- :soon: in development
- :calendar: in planning
- :x: is not supported

### Workspaces

| Nx workspace (native) | Nx workspace (angular) |  angular   |
| :-------------------: | :--------------------: | :--------: |
|      :calendar:       |   :white_check_mark:   | :calendar: |

### Angular Application

| Feature        |       Azure        |        AWS         |                     GCP                      | activated in dev (default) | activated in prod (default) |
| -------------- | :----------------: | :----------------: | :------------------------------------------: | :------------------------: | :-------------------------: |
| static hosting | :white_check_mark: | :white_check_mark: | :white_check_mark: (only with custom domain) |            yes             |             yes             |
| cdn            | :white_check_mark: | :white_check_mark: |              :white_check_mark:              |             no             |             yes             |
| custom domain  |     :calendar:     |     :calendar:     |              :white_check_mark:              |        no (GCP yes)        |             no              |

### Angular Universal Application

| Feature    |   Azure    |    AWS     |    GCP     | activated in dev (default) | activated in prod (default) |
| ---------- | :--------: | :--------: | :--------: | :------------------------: | :-------------------------: |
| server     | :calendar: | :calendar: | :calendar: |            yes             |             yes             |
| serverless | :calendar: | :calendar: | :calendar: |            yes             |             yes             |

### NestJS

| Feature         |   Azure    |    AWS     |    GCP     |
| --------------- | :--------: | :--------: | :--------: |
| serverless      | :calendar: | :calendar: | :calendar: |
| server instance | :calendar: | :calendar: | :calendar: |

If you use the nx workspace or angular workspace with other types of applications and you want to have them supported by ng-deploy-universal, please feel free and create a new Issue and of course ;) -> Contributions are welcome!
