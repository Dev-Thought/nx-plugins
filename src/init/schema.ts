import { PROVIDER } from '../utils/provider';

export interface InitOptions {
  provider: PROVIDER;
  project: string;
  customDomainName?: string;
  region?: string;
}
