/**
 * HTTP helper for Björn Lunden API — routes through PostgreSQL's `http` extension.
 *
 * The BL API server (apigateway.blinfo.se) uses TLS ciphers incompatible with
 * Deno's rustls stack (HandshakeFailure). PostgreSQL's pgsql-http extension
 * uses libcurl (OpenSSL), which handles these ciphers correctly.
 */
import { getDb } from '../../lib/db.ts';

/**
 * POST with form-encoded body via pg http extension. Returns parsed JSON.
 */
export async function postForm(
  url: string,
  params: Record<string, string>,
): Promise<{ status: number; data: Record<string, unknown> }> {
  const sql = getDb();
  const body = new URLSearchParams(params).toString();

  const rows = await sql`
    SELECT status, content
    FROM extensions.http_post(
      ${url},
      ${body},
      'application/x-www-form-urlencoded'
    )
  `;

  const row = rows[0];
  return {
    status: row.status as number,
    data: JSON.parse(row.content as string),
  };
}

/**
 * GET with custom headers via pg http extension. Returns parsed JSON.
 */
export async function getJson<T>(
  url: string,
  headers: Record<string, string>,
): Promise<{ status: number; statusText: string; data: T; body: string }> {
  const sql = getDb();

  // Build header array for extensions.http()
  const headerEntries = Object.entries(headers);
  headerEntries.push(['Accept', 'application/json']);

  // Use extensions.http() with a composite http_request to pass custom headers
  const rows = await sql`
    SELECT status, content
    FROM extensions.http((
      'GET',
      ${url},
      ARRAY[${sql.unsafe(
        headerEntries
          .map(([k, v]) => `extensions.http_header(${escapeLiteral(k)}, ${escapeLiteral(v)})`)
          .join(', ')
      )}],
      NULL,
      NULL
    )::extensions.http_request)
  `;

  const row = rows[0];
  const content = row.content as string;
  return {
    status: row.status as number,
    statusText: '',
    data: JSON.parse(content) as T,
    body: content,
  };
}

/** Escape a string as a PostgreSQL string literal (single-quote escaping). */
function escapeLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}
