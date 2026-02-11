/**
 * Dev server: starts the full API on port 3456 with real providers.
 * Reads config from the repo root .env file.
 *
 * Started automatically by `npm run dev` via turbo.
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import http from 'node:http';

// Load .env from repo root
const rootDir = resolve(import.meta.dirname, '../..');
try {
  const envContent = readFileSync(resolve(rootDir, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // No .env file
}

import { SQLiteAdapter, consoleLogger } from '@arcim-sync/core';
import { createServer } from './src/app.js';

async function main() {
  // Use file-based SQLite so data persists across dev server restarts
  const dataDir = resolve(rootDir, '.data');
  mkdirSync(dataDir, { recursive: true });
  const dbPath = resolve(dataDir, 'dev.sqlite');
  console.log(`  Database: ${dbPath}`);
  const db = new SQLiteAdapter(dbPath);
  await db.migrate();

  const app = createServer({
    db,
    logger: consoleLogger,
    tokenEncryptionKey: process.env['API_KEY_ENCRYPTION_KEY'] || '0123456789abcdef'.repeat(4),
    mode: 'self-hosted',
    fortnoxOAuth: process.env['FORTNOX_CLIENT_ID']
      ? {
          clientId: process.env['FORTNOX_CLIENT_ID']!,
          clientSecret: process.env['FORTNOX_CLIENT_SECRET']!,
          redirectUri: process.env['FORTNOX_REDIRECT_URI']!,
        }
      : undefined,
    vismaOAuth: process.env['VISMA_CLIENT_ID']
      ? {
          clientId: process.env['VISMA_CLIENT_ID']!,
          clientSecret: process.env['VISMA_CLIENT_SECRET']!,
          redirectUri: process.env['VISMA_REDIRECT_URI']!,
        }
      : undefined,
  });

  const port = 3456;

  const server = http.createServer(async (req, res) => {
    const url = `http://localhost:${port}${req.url}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    }

    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const body = hasBody
      ? await new Promise<Buffer>((resolve) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
        })
      : undefined;

    const request = new Request(url, { method: req.method, headers, body });
    const response = await app.fetch(request);

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const responseBody = await response.text();
    res.end(responseBody);
  });

  server.listen(port, () => {
    console.log(`\n  API server running on http://localhost:${port}\n`);
  });
}

main().catch(console.error);
