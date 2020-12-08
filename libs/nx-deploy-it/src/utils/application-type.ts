import {
  TargetDefinition,
  TargetDefinitionCollection
} from '@angular-devkit/core/src/workspace';
import { resolve } from 'path';
import * as ts from 'typescript';
import { readFileSync } from 'fs-extra';
import { hasImport } from './ats.utils';
import { Tree } from '@angular-devkit/schematics';

export enum ApplicationType {
  ANGULAR = 'angular',
  REACT = 'react',
  NESTJS = 'nestjs',
  EXPRESS = 'express',
  ANGULAR_UNIVERSAL = 'angular-universal'
}

function getTarget(
  targets: TargetDefinitionCollection | {},
  targetName: string
): TargetDefinition {
  if (
    (targets as TargetDefinitionCollection).get &&
    typeof (targets as TargetDefinitionCollection).get === 'function'
  ) {
    return (targets as TargetDefinitionCollection).get(targetName);
  }

  return targets[targetName];
}

function isAngular(targets: TargetDefinitionCollection): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  return build.builder === '@angular-devkit/build-angular:browser';
}

function isAngularCustomWebpack(targets: TargetDefinitionCollection): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  return build.builder === '@angular-builders/custom-webpack:browser';
}

function isAngularUniversal(targets: TargetDefinitionCollection): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  const serveSsr = getTarget(targets, 'serve-ssr');
  const prerender = getTarget(targets, 'prerender');
  const server = getTarget(targets, 'server');
  return (
    build.builder === '@angular-devkit/build-angular:browser' &&
    !!serveSsr &&
    !!prerender &&
    !!server
  );
}

function isNestJS(targets: TargetDefinitionCollection, host: Tree): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  if (build.builder !== '@nrwl/node:build') {
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

function isExpressJS(targets: TargetDefinitionCollection): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  if (build.builder !== '@nrwl/node:build') {
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

function isReact(targets: TargetDefinitionCollection): boolean {
  const build = getTarget(targets, 'build');
  if (!build) {
    return false;
  }
  return (
    build.builder === '@nrwl/web:build' &&
    build.options.webpackConfig.toString().startsWith('@nrwl/react') &&
    build.options.main.toString().endsWith('.tsx')
  );
}

export function getApplicationType(
  targets: TargetDefinitionCollection,
  host?: Tree
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
