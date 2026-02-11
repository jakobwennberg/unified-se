/** Common types shared across DTOs */

export interface AmountType {
  value: number;
  currencyCode: string;
}

export interface PostalAddress {
  streetName?: string;
  additionalStreetName?: string;
  buildingNumber?: string;
  cityName?: string;
  postalZone?: string;
  countrySubentity?: string;
  countryCode?: string;
}

export interface Contact {
  name?: string;
  telephone?: string;
  email?: string;
  website?: string;
}

export interface PartyIdentification {
  id: string;
  schemeId?: string; // e.g. 'GLN', 'DUNS', 'SE:ORGNR'
}

export interface PartyLegalEntity {
  registrationName: string;
  companyId?: string; // org number
  companyIdSchemeId?: string;
}

export interface PartyDto {
  name: string;
  identifications: PartyIdentification[];
  postalAddress?: PostalAddress;
  legalEntity?: PartyLegalEntity;
  contact?: Contact;
}

export interface FinancialDimensionRef {
  dimensionId: string;
  dimensionValueId: string;
  name?: string;
}

export interface AllowanceChargeDto {
  chargeIndicator: boolean; // true = charge, false = allowance
  reason?: string;
  amount: AmountType;
  taxPercent?: number;
}

export interface TaxTotalDto {
  taxAmount: AmountType;
  taxSubtotals?: TaxSubtotalDto[];
}

export interface TaxSubtotalDto {
  taxableAmount: AmountType;
  taxAmount: AmountType;
  taxCategory?: string;
  percent?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}
