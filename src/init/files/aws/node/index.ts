import * as aws from '@pulumi/aws';
import * as awsx from '@pulumi/awsx';

// TODO: add API name from project
// Create an API endpoint
const endpoint = new awsx.apigateway.API('hello-world', {
  routes: [
    {
      path: '/{route+}',
      // TODO: allow all METHODS
      method: 'GET',
      eventHandler: async event => {
        return {
          statusCode: 200,
          body: 'Add content'
        };
      }
    }
  ]
});

exports.endpoint = endpoint.url;
