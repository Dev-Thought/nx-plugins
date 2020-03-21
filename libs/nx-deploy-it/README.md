# @dev-thought/nx-deploy-it

[![npm version](https://badge.fury.io/js/%40dev-thought%2Fnx-deploy-it.svg)](https://www.npmjs.com/package/@dev-thought/nx-deploy-it)
[![The MIT License](https://img.shields.io/badge/license-MIT-orange.svg?color=blue&style=flat-square)](http://opensource.org/licenses/MIT)

**Deploy applications in nx / angular workspaces to the cloud using a provider of your Choice (Azure, AWS, Google Cloud Platform)**

![AWS example](/docs/nx-deploy-it-aws.gif?raw=true)

We are using under the hood the code as infrastructure tool [Pulumi](https://www.pulumi.com/). It gives you the possibility to have every piece of code under your control. You can extend it with your requirements (VPN, ...) and still able to use the schematics for deployment.

## Quick-start <a name="quickstart"></a>

1. Create a new project with the nx cli.

   ```sh
   npx create-nx-workspace@latest hello-world --preset "angular-nest" --appName "hello-world" --style="scss"
   cd hello-world
   ```

1. Add `nx-deploy-it` to your project. The tool will search for supported applications and ask you which one of them you want to setup. You may be prompted to answer some questions for the setup.

   ```sh
   npx ng add @dev-thought/nx-deploy-it
   ```

1. Switch to local state management.

   ```sh
   npx pulumi login --local
   ```

1. Deploy your project to your cloud provider.

   ```sh
   npx ng run hello-world:deploy
   ```

   The project will be built with the development configuration.
   In development you will be asked to confirm the changes of your infrastructure

1. Everything is done and you want to remove your whole infrastructure. No problem ;) Just do it with

   ```sh
   npx ng run hello-world:destroy
   ```

You can initialize any time infrastructure as code for your project if you skipped the setup on ng add.

```sh
npx ng g @dev-thought/nx-deploy-it:init
```

## Requirements

You will need the Angular CLI, an Angular project, and an Azure Subscription to deploy to Azure. Details of these requirements are in this section.

## :bangbang: Cloud provider setup

nx-deploy-it is only working with already configured cloud providers. If you need to know how to set up them, please follow the first steps in the [Pulumi Quickstart](https://www.pulumi.com/docs/get-started/) for your provider.

## Infrastructure as code and their state

As many things in development, infrastructure as code needs to hold a state somewhere. This is how the tools can check if something has changed and to do only updates where it is necessary. Pulumi provides different ways to hold the state.
The simplest way at the beginning is to hold it local. It's perfect for your local development. Since you want to share it with multiple colleagues or to feel better if it is not only on your disk, you might think about a persistent solution in the cloud with your provider, which you can choose here or with Pulumi self. You can read more about it [here](https://www.pulumi.com/docs/reference/cli/pulumi_login/).
nx-deploy-it installs pulumi as binary in your node_modules folder so you can use it with `npx` easy.

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

| Nx workspace (native & angular) | angular |
| :-----------------------------: | :-----: |
|               Nx                |   Ng    |

### Angular Application

| Feature        |       Azure        |        AWS         |                     GCP                      | Workspace | activated in dev (default) | activated in prod (default) |
| -------------- | :----------------: | :----------------: | :------------------------------------------: | :-------: | :------------------------: | :-------------------------: |
| static hosting | :white_check_mark: | :white_check_mark: | :white_check_mark: (only with custom domain) |  Nx, Ng   |            yes             |             yes             |
| cdn            | :white_check_mark: | :white_check_mark: |              :white_check_mark:              |  Nx, Ng   |             no             |             yes             |
| custom domain  | :white_check_mark: | :white_check_mark: |              :white_check_mark:              |  Nx, Ng   |        no (GCP yes)        |        no (GCP yes)         |

Custom domains need some manual configuration step. You need to verify them for the providers.

#### Azure custom domain setup

To verify your custom domain you need to create a CNAME record in your DNS settings. You can read about more about it [here](https://docs.microsoft.com/en-us/azure/cdn/cdn-map-content-to-custom-domain#map-the-permanent-custom-domain).
Azure only allows a set of characters. So the `.` in your custom domain name will be replaced with a `-`. If your custom domain is `www.example.com` then your cdn name will be `www-example-com.azureedge.net`.

HINT: Current limitation: domain name must have maximum 50 characters

#### GCP custom domain setup

Google makes it really easy. You can use the [google webmaster](https://www.google.com/webmasters/verification/home).

#### AWS custom domain setup

For AWS we need to create first a hosted zone with the domain name e.g.: if your domain is `www.my-domain.com` than use the name `my-domain.com` for the hosted zone. After this is done you get name servers. Now you can replace the name servers from your domain with the one from aws and you have everything under conrtol via AWS route 53. The rest will be done by nx-deploy-it. It will create the ssl certification and validates if you are the owner of the domain.
You can create the hosted zone in the [Route53](https://console.aws.amazon.com/route53/home#hosted-zones:) Service

### Angular Universal Application

| Feature         |   Azure    |    AWS     |    GCP     | Workspace  | activated in dev (default) | activated in prod (default) |
| --------------- | :--------: | :--------: | :--------: | :--------: | :------------------------: | :-------------------------: |
| serverless      | :calendar: | :calendar: | :calendar: | :calendar: |            yes             |             yes             |
| server instance | :calendar: | :calendar: | :calendar: | :calendar: |            yes             |             yes             |

### NestJS

| Feature         |                    Azure                    |        AWS         |        GCP         | Workspace  |
| --------------- | :-----------------------------------------: | :----------------: | :----------------: | :--------: |
| serverless      | :white_check_mark: (with azure VSC support) | :white_check_mark: | :white_check_mark: |     Nx     |
| server instance |                 :calendar:                  |     :calendar:     |     :calendar:     | :calendar: |

If you use the nx workspace or angular workspace with other types of applications and you want to have them supported by nx-deploy-it, please feel free and create a new Issue and of course ;) -> Contributions are welcome!
