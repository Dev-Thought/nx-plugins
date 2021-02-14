import { ExpressAdapter } from '@nestjs/platform-express';
import * as serverless from 'aws-serverless-express';
import * as express from 'express';
import { Server } from 'http';
import { createApp } from '../../../<%= getRootDirectory() %>/main.aws';

let cachedServer: Server;

async function bootstrapServer(): Promise<Server> {
  const expressServer = express();
  await createApp(new ExpressAdapter(expressServer));

  return serverless.createServer(expressServer);
}

export const handler = (event, context) => {
  if (!cachedServer) {
    bootstrapServer().then(server => {
      cachedServer = server;
      serverless.proxy(server, event, context);
    });
  } else {
    serverless.proxy(cachedServer, event, context);
  }
};
