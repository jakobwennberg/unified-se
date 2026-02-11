import { TokenBucketRateLimiter } from '../../lib/rate-limiter.ts';
import { withRetry } from '../../lib/retry.ts';
import { FORTNOX_BASE_URL, FORTNOX_RATE_LIMIT } from './config.ts';

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
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
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

  async getPage<T>(
    accessToken: string,
    path: string,
    listKey: string,
    options?: { page?: number; pageSize?: number; lastModified?: string },
  ): Promise<{ items: T[]; page: number; totalPages: number; totalCount: number }> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
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
      | { '@TotalPages': number; '@CurrentPage': number; '@TotalResources': number }
      | undefined;

    const totalPages = meta?.['@TotalPages'] ?? 1;
    const currentPage = meta?.['@CurrentPage'] ?? 1;
    const totalCount = meta?.['@TotalResources'] ?? 0;

    const items = response[listKey];
    return {
      items: Array.isArray(items) ? (items as T[]) : [],
      page: currentPage,
      totalPages,
      totalCount,
    };
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
      const result = await this.getPage<T>(accessToken, path, listKey, {
        page,
        pageSize: options?.pageSize,
        lastModified: options?.lastModified,
      });

      allItems.push(...result.items);
      totalPages = result.totalPages;
      page++;
    } while (page <= totalPages);

    return allItems;
  }
}
