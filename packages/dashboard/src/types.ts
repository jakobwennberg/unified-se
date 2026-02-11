export interface ConsentRecord {
  id: string;
  tenantId: string;
  name: string;
  status: number;
  provider: string;
  orgNumber?: string;
  companyName?: string;
  etag: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiClient {
  baseUrl: string;
  headers: Record<string, string>;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body: unknown, etag?: string): Promise<T>;
  delete(path: string): Promise<void>;
}

export const CONSENT_STATUS_LABELS: Record<number, string> = {
  0: 'Created',
  1: 'Accepted',
  2: 'Revoked',
  3: 'Inactive',
};

export const CONSENT_STATUS_COLORS: Record<number, string> = {
  0: '#FFA500', // orange
  1: '#22C55E', // green
  2: '#EF4444', // red
  3: '#6B7280', // gray
};

export const PROVIDER_LABELS: Record<string, string> = {
  fortnox: 'Fortnox',
  visma: 'Visma eEkonomi',
  bokio: 'Bokio',
  bjornlunden: 'Björn Lundén',
};
