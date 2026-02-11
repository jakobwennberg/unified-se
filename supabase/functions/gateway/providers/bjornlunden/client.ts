import { TokenBucketRateLimiter } from '../../lib/rate-limiter.ts';
import { withRetry } from '../../lib/retry.ts';
import { BL_BASE_URL, BL_RATE_LIMIT } from './config.ts';
import { getJson } from './http.ts';

export class BjornLundenApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'BjornLundenApiError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof BjornLundenApiError) {
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

interface BLPaginatedResponse<T> {
  pageRequested: number;
  totalPages: number;
  totalRows: number;
  data: T[];
}

export class BjornLundenClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? BL_BASE_URL;
    this.rateLimiter = new TokenBucketRateLimiter(BL_RATE_LIMIT);
  }

  /**
   * Low-level GET with Bearer token + User-Key header.
   * Uses Node's https module (via http.ts) because the BL server's TLS ciphers
   * are incompatible with Deno's rustls stack.
   */
  async get<T>(accessToken: string, userKey: string, path: string): Promise<T> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const url = `${this.baseUrl}${path}`;
        const res = await getJson<T>(url, {
          'Authorization': `Bearer ${accessToken}`,
          'User-Key': userKey,
        });

        if (res.status < 200 || res.status >= 300) {
          throw new BjornLundenApiError(
            `Björn Lunden API error: ${res.status} ${res.statusText}`,
            res.status,
            res.body,
          );
        }

        return res.data;
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
   * BL returns `{ pageRequested, totalPages, totalRows, data: [...] }`.
   */
  async getPage<T>(
    accessToken: string,
    userKey: string,
    relativePath: string,
    options?: { page?: number; pageSize?: number },
  ): Promise<{ items: T[]; page: number; totalPages: number; totalCount: number }> {
    const params = new URLSearchParams();
    params.set('pageRequested', String(options?.page ?? 1));
    params.set('rowsRequested', String(options?.pageSize ?? 50));
    // Journal batch uses 'rows' instead of 'rowsRequested' — send both for compatibility
    params.set('rows', String(options?.pageSize ?? 50));

    const path = `${relativePath}?${params.toString()}`;
    const response = await this.get<BLPaginatedResponse<T>>(accessToken, userKey, path);

    return {
      items: Array.isArray(response.data) ? response.data : [],
      page: response.pageRequested ?? (options?.page ?? 1),
      totalPages: response.totalPages ?? 1,
      totalCount: response.totalRows ?? 0,
    };
  }

  /**
   * Fetch a non-paginated list endpoint.
   * Some BL endpoints return a flat array instead of the pagination wrapper.
   */
  async getAll<T>(accessToken: string, userKey: string, path: string): Promise<T[]> {
    const response = await this.get<T[] | BLPaginatedResponse<T>>(accessToken, userKey, path);
    // Handle both flat array and paginated wrapper
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response.data) ? response.data : [];
  }

  /**
   * Fetch a single resource detail.
   * BL returns the object directly (no wrapper).
   */
  async getDetail<T>(accessToken: string, userKey: string, path: string): Promise<T> {
    return this.get<T>(accessToken, userKey, path);
  }
}
