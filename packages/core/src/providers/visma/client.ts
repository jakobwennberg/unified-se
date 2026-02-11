import { TokenBucketRateLimiter } from '../../utils/rate-limiter.js';
import { withRetry } from '../../utils/retry.js';
import { VISMA_BASE_URL, VISMA_RATE_LIMIT } from './config.js';
import type { VismaPaginatedResponse, VismaSIEExportResponse } from './types.js';

export class VismaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'VismaApiError';
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof VismaApiError) {
    if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
      return false;
    }
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

export class VismaClient {
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? VISMA_BASE_URL;
    this.rateLimiter = new TokenBucketRateLimiter(VISMA_RATE_LIMIT);
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
          throw new VismaApiError(
            `Visma API error: ${response.status} ${response.statusText}`,
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
          throw new VismaApiError(
            `Visma API error: ${response.status} ${response.statusText}`,
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

  /**
   * Paginated GET using OData $top/$skip.
   * Supports incremental sync via $filter on the modified field.
   */
  async getPaginated<T>(
    accessToken: string,
    path: string,
    options?: {
      modifiedSince?: string;
      modifiedField?: string;
      pageSize?: number;
    },
  ): Promise<T[]> {
    const allItems: T[] = [];
    const pageSize = options?.pageSize ?? 100;
    let page = 1;
    let totalPages = 1;

    do {
      const params = new URLSearchParams();
      params.set('$top', String(pageSize));
      params.set('$skip', String((page - 1) * pageSize));

      if (options?.modifiedSince && options?.modifiedField) {
        params.set(
          '$filter',
          `${options.modifiedField} gt ${options.modifiedSince}`,
        );
      }

      const separator = path.includes('?') ? '&' : '?';
      const fullPath = `${path}${separator}${params.toString()}`;

      const response = await this.get<VismaPaginatedResponse<T>>(accessToken, fullPath);

      if (response.Meta) {
        totalPages = response.Meta.TotalNumberOfPages ?? 1;
      }

      if (Array.isArray(response.Data)) {
        allItems.push(...response.Data);
      }

      page++;
    } while (page <= totalPages);

    return allItems;
  }

  /**
   * Fetch a SIE export file via the TemporaryUrl pattern.
   * 1. GET /sie4export/{from}/{to} → { TemporaryUrl }
   * 2. Download the file from TemporaryUrl
   */
  async getBinary(accessToken: string, path: string): Promise<Buffer> {
    // Step 1: Get the temporary download URL
    const exportResponse = await this.get<VismaSIEExportResponse>(accessToken, path);

    if (!exportResponse.TemporaryUrl) {
      throw new VismaApiError('No TemporaryUrl in SIE export response', 500);
    }

    // Step 2: Download the actual file (no auth needed for temp URLs)
    return withRetry(
      async () => {
        await this.rateLimiter.acquire();
        const response = await fetch(exportResponse.TemporaryUrl);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new VismaApiError(
            `Visma SIE download error: ${response.status} ${response.statusText}`,
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
