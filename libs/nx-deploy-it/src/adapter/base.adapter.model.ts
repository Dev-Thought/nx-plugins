import { PROVIDER } from '../utils/provider';
import { JsonObject } from '@angular-devkit/core';

export interface NxDeployItBaseOptions extends JsonObject {
  provider: PROVIDER;
  project: string;
}
