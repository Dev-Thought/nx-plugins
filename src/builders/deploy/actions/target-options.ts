import { PROVIDER } from '../../../utils/provider';
import { JsonObject } from '@angular-devkit/core';

export interface DeployTargetOptions extends JsonObject {
  useCdn: boolean;
  main: string;
  provider: PROVIDER;
}
