import { TargetConfiguration, Tree } from '@nrwl/devkit';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as ts from 'typescript';
import { hasImport } from './ats.utils';

export enum ApplicationType {
  ANGULAR = 'angular',
  REACT = 'react',
  NESTJS = 'nestjs',
  EXPRESS = 'express',
  ANGULAR_UNIVERSAL = 'angular-universal',
}

export function getApplicationType(
  targets: {
    [targetName: string]: TargetConfiguration;
  },
  host: Tree
): ApplicationType {
  if (!targets) {
    return null;
  }

  if (isNestJS(targets, host)) {
    return ApplicationType.NESTJS;
  }
  if (isExpressJS(targets)) {
    return ApplicationType.EXPRESS;
  }

  if (isAngularUniversal(targets)) {
    return ApplicationType.ANGULAR_UNIVERSAL;
  }
  if (isAngular(targets)) {
    return ApplicationType.ANGULAR;
  }
  if (isAngularCustomWebpack(targets)) {
    return ApplicationType.ANGULAR;
  }
  if (isReact(targets)) {
    return ApplicationType.REACT;
  }

  return null;
}

function isAngular(targets: {
  [targetName: string]: TargetConfiguration;
}): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  return build.executor === '@angular-devkit/build-angular:browser';
}

function isAngularCustomWebpack(targets: {
  [targetName: string]: TargetConfiguration;
}): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  return build.executor === '@angular-builders/custom-webpack:browser';
}

function isAngularUniversal(targets: {
  [targetName: string]: TargetConfiguration;
}): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  const serveSsr = targets['serve-ssr'];
  const prerender = targets.prerender;
  const server = targets.server;
  return (
    build.executor === '@angular-devkit/build-angular:browser' &&
    !!serveSsr &&
    !!prerender &&
    !!server
  );
}

function isExpressJS(targets: {
  [targetName: string]: TargetConfiguration;
}): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  if (build.executor !== '@nrwl/node:build') {
    return false;
  }
  const mainPath = resolve(build.options.main.toString());
  const mainSource = readFileSync(mainPath).toString('utf-8');
  const main = ts.createSourceFile(
    mainPath,
    mainSource,
    ts.ScriptTarget.Latest
  );
  return (
    !hasImport(main.statements, '@nestjs') &&
    hasImport(main.statements, 'express')
  );
}

function isReact(targets: {
  [targetName: string]: TargetConfiguration;
}): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  return (
    build.executor === '@nrwl/web:build' &&
    build.options.webpackConfig.toString().startsWith('@nrwl/react') &&
    build.options.main.toString().endsWith('.tsx')
  );
}

function isNestJS(
  targets: {
    [targetName: string]: TargetConfiguration;
  },
  host: Tree
): boolean {
  const build = targets.build;
  if (!build) {
    return false;
  }
  if (build.executor !== '@nrwl/node:build') {
    return false;
  }
  const mainPath = build.options.main.toString();
  let mainSource: string;
  if (host) {
    mainSource = host.read(mainPath).toString('utf-8');
  } else {
    mainSource = readFileSync(resolve(mainPath)).toString('utf-8');
  }
  const main = ts.createSourceFile(
    mainPath,
    mainSource,
    ts.ScriptTarget.Latest
  );
  return hasImport(main.statements, '@nestjs');
}
