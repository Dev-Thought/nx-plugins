import { NestFactory } from '@nestjs/core';
import { <%= getRootModuleName() %>  } from './<%= getRootModulePath() %>';
import { ExpressAdapter } from '@nestjs/platform-express';

export const createNestServer = async expressApp => {
  expressApp.disable('x-powered-by');
  const app = await NestFactory.create(<%= getRootModuleName() %>, new ExpressAdapter(expressApp));

  app.enableCors();
  return app.init();
};
