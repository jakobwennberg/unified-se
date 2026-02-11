import { TokenBucketRateLimiter } from '../../lib/rate-limiter.ts';
import { withRetry } from '../../lib/retry.ts';
import { BRIOX_BASE_URL, BRIOX_RATE_LIMIT } from './config.ts';

export class BrioxApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'BrioxApiError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof BrioxApiError) {
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

interface BrioxListResponse {
  data: Record<string, unknown> & {
    metainformation?: {
      total_pages: number;
      current_page: number;
      total_count: number;
    };
  };
}

export class BrioxClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? BRIOX_BASE_URL;
    this.rateLimiter = new TokenBucketRateLimiter(BRIOX_RATE_LIMIT);
  }

  async get<T>(accessToken: string, path: string): Promise<T> {
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const url = `${this.baseUrl}${path}`;
        const response = await fetch(url, {
          headers: {
            Authorization: accessToken,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new BrioxApiError(
            `Briox API error: ${response.status} ${response.statusText}`,
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
    options?: {
      page?: number;
      pageSize?: number;
      fromModifiedDate?: string;
    },
  ): Promise<{ items: T[]; page: number; totalPages: number; totalCount: number }> {
    const params = new URLSearchParams();
    params.set('page', String(options?.page ?? 1));
    if (options?.pageSize) {
      params.set('limit', String(options.pageSize));
    }
    if (options?.fromModifiedDate) {
      params.set('frommodifieddate', options.fromModifiedDate);
    }

    const separator = path.includes('?') ? '&' : '?';
    const fullPath = `${path}${separator}${params.toString()}`;

    const response = await this.get<BrioxListResponse>(accessToken, fullPath);

    const meta = response.data?.metainformation;
    const totalPages = meta?.total_pages ?? 1;
    const currentPage = meta?.current_page ?? (options?.page ?? 1);
    const totalCount = meta?.total_count ?? 0;

    const items = listKey ? response.data?.[listKey] : response.data;

    return {
      items: Array.isArray(items) ? items as T[] : [],
      page: currentPage,
      totalPages,
      totalCount,
    };
  }

  async getPaginated<T>(
    accessToken: string,
    path: string,
    listKey: string,
    options?: {
      fromModifiedDate?: string;
      pageSize?: number;
    },
  ): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const result = await this.getPage<T>(accessToken, path, listKey, {
        page,
        pageSize: options?.pageSize,
        fromModifiedDate: options?.fromModifiedDate,
      });

      allItems.push(...result.items);
      totalPages = result.totalPages;
      page++;
    } while (page <= totalPages);

    return allItems;
  }

  /**
   * Get the current financial year ID from Briox.
   * The journal endpoint requires a financial year ID (e.g. "10"), not a calendar year.
   */
  async getCurrentFinancialYear(accessToken: string): Promise<string> {
    const response = await this.get<{
      data: {
        financialyears: { id: string; fromdate: string; todate: string }[];
      };
    }>(accessToken, '/financialyear');

    const years = response.data?.financialyears ?? [];
    if (years.length === 0) {
      throw new BrioxApiError('No financial years found in Briox', 404);
    }
    // Return the last (most recent) financial year ID
    return years[years.length - 1]!.id;
  }
}
