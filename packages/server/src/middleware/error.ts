import type { ErrorHandler } from 'hono';

/**
 * Global error handler. Returns consistent JSON error responses.
 * Forwards provider API status codes (401, 403, etc.) instead of always returning 500.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Invalid JSON body (Hono throws SyntaxError)
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const message = err instanceof Error ? err.message : String(err);

  // Forward upstream provider status codes (e.g., FortnoxApiError)
  let status: 500 | 401 | 403 | 502 = 500;
  if (err instanceof Error && 'statusCode' in err) {
    const upstreamStatus = (err as Error & { statusCode: number }).statusCode;
    if (upstreamStatus === 401 || upstreamStatus === 403) {
      status = upstreamStatus;
    } else if (upstreamStatus >= 400) {
      // Upstream provider errors become 502 (bad gateway)
      status = 502;
    }
  }

  return c.json(
    {
      error: message,
      ...(err instanceof Error && 'statusCode' in err
        ? { providerStatus: (err as Error & { statusCode: number }).statusCode }
        : {}),
    },
    status,
  );
};
