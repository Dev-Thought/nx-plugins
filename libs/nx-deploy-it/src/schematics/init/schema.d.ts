import { NxDeployItBaseOptions } from '../../adapter/base.adapter.model';

export interface NxDeployItInitSchematicSchema extends NxDeployItBaseOptions {
  customDomainName?: string;
  'azure:location'?: string;
  'aws:region'?: string;
  'aws:profile'?: string;
  'gcp:projectId'?: string;
}
