export type {
  ProviderName,
  AuthType,
  RateLimitConfig,
  ProviderCapabilities,
  ProviderCredentials,
  CompanyInfo,
  FinancialYear,
} from './provider.js';

export { ProviderNameSchema, AuthTypeSchema } from './provider.js';

export type {
  EntityType,
  CanonicalEntityRecord,
  FetchEntitiesOptions,
  FetchEntitiesResult,
  FetchProgressCallback,
} from './entity.js';

export { EntityTypeSchema } from './entity.js';

export type {
  SyncStatus,
  SyncJob,
  EntitySyncResult,
  SIESyncResult,
  SyncProgress,
  SyncState,
} from './sync.js';

export type {
  UpsertResult,
  GetEntitiesOptions,
  ConnectionRecord,
  DatabaseAdapter,
} from './database.js';

export type {
  SIEType,
  SIEBalanceType,
  SIEMetadata,
  SIEAccount,
  SIEBalance,
  SIETransaction,
  SIEDimension,
  SIEParseResult,
  SIEKPIs,
  SIEUpload,
  SIEFullData,
  FetchSIEOptions,
  FetchSIEResult,
} from './sie.js';

export {
  ConsentStatus,
  type ConsentRecord,
  type ConsentTokenRecord,
  type OneTimeCode,
  type CreateConsentInput,
} from './consent.js';

// Generation types
export type {
  CompanyIndustry,
  CompanySize,
  GenerateCompanyRequest,
  CompanyProfile,
  GenerateCompanyResult,
} from './generate.js';

// DTOs
export * from './dto/index.js';
