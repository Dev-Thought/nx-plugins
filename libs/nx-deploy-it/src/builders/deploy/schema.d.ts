import { JsonObject } from '@angular-devkit/core';

export interface NxDeployItDeployBuilderSchema extends JsonObject {
  noBuild?: boolean;
  nonInteractive?: boolean;
}
