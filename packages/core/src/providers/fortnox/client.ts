import { TokenBucketRateLimiter } from '../../utils/rate-limiter.js';
import { withRetry } from '../../utils/retry.js';
import { FORTNOX_BASE_URL, FORTNOX_RATE_LIMIT } from './config.js';

export class FortnoxApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'FortnoxApiError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof FortnoxApiError) {
    // Don't retry auth errors or not-found
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
    // Retry rate limits and server errors
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

export class FortnoxClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? FORTNOX_BASE_URL;
    this.rateLimiter = new TokenBucketRateLimiter(FORTNOX_RATE_LIMIT);
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
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new FortnoxApiError(
            `Fortnox API error: ${response.status} ${response.statusText}`,
            response.status,
            body,
          );
        }

        return response.json() as Promise<T>;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        shouldRetry: isRetryableError,
      },
    );
  }

  async post<T>(accessToken: string, path: string, body: Record<string, unknown>): Promise<T> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const responseBody = await response.text().catch(() => '');
          throw new FortnoxApiError(
            `Fortnox API error: ${response.status} ${response.statusText}`,
            response.status,
            responseBody,
          );
        }

        return response.json() as Promise<T>;
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        shouldRetry: isRetryableError,
      },
    );
  }

  async getPaginated<T>(
    accessToken: string,
    path: string,
    listKey: string,
    options?: { lastModified?: string; pageSize?: number },
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (options?.pageSize) {
        params.set('limit', String(options.pageSize));
      }
      if (options?.lastModified) {
        params.set('lastmodified', options.lastModified);
      }

      const separator = path.includes('?') ? '&' : '?';
      const fullPath = `${path}${separator}${params.toString()}`;

      const response = await this.get<Record<string, unknown>>(accessToken, fullPath);

      const meta = response['MetaInformation'] as
        | { '@TotalPages': number; '@CurrentPage': number }
        | undefined;

      if (meta) {
        totalPages = meta['@TotalPages'] ?? 1;
      }

      const items = response[listKey];
      if (Array.isArray(items)) {
        allItems.push(...(items as T[]));
      }

      page++;
    } while (page <= totalPages);

    return allItems;
  }

  async getBinary(accessToken: string, path: string): Promise<Buffer> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/octet-stream',
          },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new FortnoxApiError(
            `Fortnox API error: ${response.status} ${response.statusText}`,
            response.status,
            body,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        shouldRetry: isRetryableError,
      },
    );
  }
}
