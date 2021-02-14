import { PROVIDER } from '../../utils/provider';
import { JsonObject } from '@angular-devkit/core';

export interface DeployTargetOptions extends JsonObject {
  main: string;
  provider: PROVIDER;
  pulumi: any;
}
