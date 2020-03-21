import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

const stackConfig = new pulumi.Config();
const config = {
  // ===== DONT'T TOUCH THIS -> CONFIG REQUIRED BY nx-deploy-it ======
  projectName: stackConfig.get('projectName')
  // ===== END ======
};
const projectName = config.projectName;
const stageName = pulumi.getStack().split('-')[0];
const region = aws.config.requireRegion();

///////////////////
// Lambda Function
///////////////////

const role = new aws.iam.Role(`${projectName}-lambda-role`, {
  assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
    Service: 'lambda.amazonaws.com'
  })
});

const policy = new aws.iam.RolePolicy(`${projectName}-lambda-policy`, {
  role,
  policy: pulumi.output({
    Version: '2012-10-17',
    Statement: [
      {
        Action: ['logs:*', 'cloudwatch:*'],
        Resource: '*',
        Effect: 'Allow'
      }
    ]
  })
});

const lambda = new aws.lambda.Function(
  `${projectName}-function`,
  {
    memorySize: 128,
    code: new pulumi.asset.FileArchive('./functions/dist/main'),
    runtime: 'nodejs12.x',
    handler: 'index.handler',
    role: role.arn
  },
  { dependsOn: [policy] }
);

///////////////////
// APIGateway RestAPI
///////////////////

function lambdaArn(arn: string) {
  return `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${arn}/invocations`;
}

// Create the API Gateway Rest API, using a swagger spec.
const restApi = new aws.apigateway.RestApi(
  `${projectName}-restapi`,
  {},
  { dependsOn: [lambda] }
);

const rootApigatewayMethod = new aws.apigateway.Method(
  `${projectName}-root-apigateway-method`,
  {
    restApi: restApi,
    resourceId: restApi.rootResourceId,
    httpMethod: 'ANY',
    authorization: 'NONE'
  }
);
const rootApigatewayIntegration = new aws.apigateway.Integration(
  `${projectName}-root-apigateway-integration`,
  {
    restApi,
    resourceId: restApi.rootResourceId,
    httpMethod: rootApigatewayMethod.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambda.arn.apply(lambdaArn)
  }
);

const proxyResource = new aws.apigateway.Resource(
  `${projectName}-proxy-resource`,
  {
    restApi,
    parentId: restApi.rootResourceId,
    pathPart: '{proxy+}'
  }
);

const proxyMethod = new aws.apigateway.Method(`${projectName}-proxy-method`, {
  restApi: restApi,
  resourceId: proxyResource.id,
  httpMethod: 'ANY',
  authorization: 'NONE'
});

const proxyIntegration = new aws.apigateway.Integration(
  `${projectName}-proxy-integration`,
  {
    restApi,
    resourceId: proxyResource.id,
    httpMethod: proxyMethod.httpMethod,
    integrationHttpMethod: 'POST',
    type: 'AWS_PROXY',
    uri: lambda.arn.apply(lambdaArn)
  }
);

// Create a deployment of the Rest API.
const deployment = new aws.apigateway.Deployment(
  `${projectName}-restapi-deployment>`,
  {
    restApi: restApi,
    // Note: Set to empty to avoid creating an implicit stage, we'll create it explicitly below instead.
    stageName: ''
  },
  { dependsOn: [rootApigatewayIntegration, proxyIntegration] }
);

// Create a stage, which is an addressable instance of the Rest API. Set it to point at the latest deployment.
const stage = new aws.apigateway.Stage(`${projectName}-restapi-stage`, {
  restApi: restApi,
  deployment: deployment,
  stageName: stageName
});

// Give permissions from API Gateway to invoke the Lambda
const invokePermission = new aws.lambda.Permission(
  `${projectName}-restapi-lambda-permission`,
  {
    action: 'lambda:invokeFunction',
    function: lambda,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${deployment.executionArn}*/*`
  }
);

exports.endpoint = pulumi.interpolate`${deployment.invokeUrl}${stageName}`;
