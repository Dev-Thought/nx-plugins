import { JsonObject } from '@angular-devkit/core';

export interface DestroyTargetOptions extends JsonObject {
  main: string;
}
