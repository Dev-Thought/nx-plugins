import { PROVIDER } from '../utils/provider';

export interface InitOptions {
  provider: PROVIDER;
  project: string;
  customDomainName?: string;
  'azure:location'?: string;
  'aws:region'?: string;
  'aws:profile'?: string;
  'gcp:projectId'?: string;
}
