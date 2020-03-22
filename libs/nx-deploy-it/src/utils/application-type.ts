import { TargetDefinition } from '@angular-devkit/core/src/workspace';
import { resolve } from 'path';
import * as ts from 'typescript';
import { readFileSync } from 'fs-extra';
import { hasImport } from './ats.utils';

export enum ApplicationType {
  ANGULAR = 'angular',
  REACT = 'react',
  NESTJS = 'nestjs',
  EXPRESS = 'express'
}

function isAngular(target: TargetDefinition): boolean {
  return target.builder === '@angular-devkit/build-angular:browser';
}

function isNestJS(target: TargetDefinition): boolean {
  if (target.builder !== '@nrwl/node:build') {
    return false;
  }
  const mainPath = resolve(target.options.main.toString());
  const mainSource = readFileSync(mainPath).toString('utf-8');
  const main = ts.createSourceFile(
    mainPath,
    mainSource,
    ts.ScriptTarget.Latest
  );
  return hasImport(main.statements, '@nestjs');
}

function isExpressJS(target: TargetDefinition): boolean {
  if (target.builder !== '@nrwl/node:build') {
    return false;
  }
  const mainPath = resolve(target.options.main.toString());
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

function isReact(target: TargetDefinition): boolean {
  return (
    target.builder === '@nrwl/web:build' &&
    target.options.webpackConfig.toString().startsWith('@nrwl/react') &&
    target.options.main.toString().endsWith('.tsx')
  );
}

export function getApplicationType(target: TargetDefinition): ApplicationType {
  if (!target) {
    return null;
  }

  if (isAngular(target)) {
    return ApplicationType.ANGULAR;
  }
  if (isReact(target)) {
    return ApplicationType.REACT;
  }

  if (isNestJS(target)) {
    return ApplicationType.NESTJS;
  }
  if (isExpressJS(target)) {
    return ApplicationType.EXPRESS;
  }

  return null;
}
