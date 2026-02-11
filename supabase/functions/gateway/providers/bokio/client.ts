import { TokenBucketRateLimiter } from '../../lib/rate-limiter.ts';
import { withRetry } from '../../lib/retry.ts';
import { BOKIO_BASE_URL, BOKIO_RATE_LIMIT } from './config.ts';

export class BokioApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'BokioApiError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof BokioApiError) {
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

interface BokioPaginatedResponse<T> {
  items: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

export class BokioClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? BOKIO_BASE_URL;
    this.rateLimiter = new TokenBucketRateLimiter(BOKIO_RATE_LIMIT);
  }

  async get<T>(accessToken: string, path: string): Promise<T> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new BokioApiError(
            `Bokio API error: ${response.status} ${response.statusText}`,
            response.status,
            body,
          );
        }

        return await response.json() as T;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        shouldRetry: isRetryableError,
      },
    );
  }

  /**
   * Fetch a paginated list endpoint.
   * Bokio returns `{ data: [...], pagination: { page, pageSize, totalPages, totalCount } }`.
   */
  async getPage<T>(
    accessToken: string,
    companyId: string,
    relativePath: string,
    options?: {
      page?: number;
      pageSize?: number;
      query?: string;
    },
  ): Promise<{ items: T[]; page: number; totalPages: number; totalCount: number }> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    params.set('pageSize', String(options?.pageSize ?? 50));
    if (options?.query) {
      params.set('query', options.query);
    }

    const path = `/companies/${companyId}${relativePath}?${params.toString()}`;
    const response = await this.get<BokioPaginatedResponse<T>>(accessToken, path);

    return {
      items: Array.isArray(response.items) ? response.items : [],
      page: response.currentPage ?? (options?.page ?? 1),
      totalPages: response.totalPages ?? 1,
      totalCount: response.totalItems ?? 0,
    };
  }

  /**
   * Fetch a non-paginated list endpoint (e.g. chart-of-accounts).
   * Returns the full `data` array.
   */
  async getAll<T>(
    accessToken: string,
    companyId: string,
    relativePath: string,
  ): Promise<T[]> {
    const path = `/companies/${companyId}${relativePath}`;
    const response = await this.get<T[] | { items: T[] }>(accessToken, path);
    // Bokio returns a raw array for some endpoints (e.g. chart-of-accounts)
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response.items) ? response.items : [];
  }

  /**
   * Fetch a single resource detail.
   * Bokio returns the object directly (no wrapper).
   */
  async getDetail<T>(
    accessToken: string,
    companyId: string,
    relativePath: string,
  ): Promise<T> {
    const path = `/companies/${companyId}${relativePath}`;
    return this.get<T>(accessToken, path);
  }

  /**
   * Fetch company information via GET /companies/{companyId}.
   * Returns null if the endpoint returns 404 (e.g. missing company-information:read scope).
   */
  async getCompany<T>(
    accessToken: string,
    companyId: string,
  ): Promise<T | null> {
    try {
      return await this.get<T>(accessToken, `/companies/${companyId}`);
    } catch (err) {
      if (err instanceof BokioApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  }
}
