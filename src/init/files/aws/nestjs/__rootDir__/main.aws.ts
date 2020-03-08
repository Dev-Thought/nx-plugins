import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { <%= getRootModuleName() %> } from './<%= getRootModulePath() %>';

export async function createApp(
  expressAdapter: ExpressAdapter
): Promise<INestApplication> {
  const app = await NestFactory.create(<%= getRootModuleName() %>, expressAdapter);

  app.enableCors();
  await app.init();
  return app;
}