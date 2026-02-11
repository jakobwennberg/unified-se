import type { ErrorHandler } from 'hono';

/**
 * Global error handler. Returns consistent JSON error responses.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  // Invalid JSON body (Hono throws SyntaxError)
  if (err instanceof SyntaxError && err.message.includes('JSON')) {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const message = err instanceof Error ? err.message : String(err);
  return c.json(
    {
      error: message,
      ...(err instanceof Error && 'code' in err ? { code: (err as Error & { code: string }).code } : {}),
    },
    500,
  );
};
