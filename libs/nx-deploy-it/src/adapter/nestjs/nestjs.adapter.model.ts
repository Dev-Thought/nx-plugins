import { NxDeployItBaseOptions } from '../base.adapter.model';
import { DeploymentType } from '../../utils/application-type';

export interface NestJSOptions extends NxDeployItBaseOptions {
  deploymentType: DeploymentType;
}
