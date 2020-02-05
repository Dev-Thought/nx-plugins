import { PROVIDER } from '../utils/provider';

export interface ArchitectOptions {
  main: string;
  provider: PROVIDER;
  useCdn: boolean;
  customDomainName?: string;
}
