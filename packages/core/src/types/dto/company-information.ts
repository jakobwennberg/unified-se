import type { PostalAddress, Contact, PartyLegalEntity } from './common.js';

export interface CompanyInformationDto {
  companyName: string;
  organizationNumber?: string;
  legalEntity?: PartyLegalEntity;
  address?: PostalAddress;
  contact?: Contact;
  vatNumber?: string;
  fiscalYearStart?: string; // MM-DD
  baseCurrency?: string;
  _raw?: Record<string, unknown>;
}
