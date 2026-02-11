/**
 * Try-it script: spins up the full API with a mock Fortnox provider
 * and SQLite in-memory DB so you can poke around with curl.
 *
 * Usage:
 *   npx tsx try-it.ts
 *
 * Then in another terminal, follow the commands printed on startup.
 */

import http from 'node:http';
import {
  SQLiteAdapter,
  registerProvider,
  contentHash,
  consoleLogger,
  ResourceType,
} from '@arcim-sync/core';
import type {
  AccountingProviderV2,
  ResourceCapabilities,
  ResourceQueryOptions,
  CanonicalEntityRecord,
  EntityType,
  ProviderCredentials,
  PaginatedResponse,
  SalesInvoiceDto,
  CustomerDto,
} from '@arcim-sync/core';
import { createServer } from '@arcim-sync/server';

// ── Mock Fortnox provider (returns fixture data, no real API calls) ──

function createMockProvider(): AccountingProviderV2 {
  const invoices = [
    { DocumentNumber: '1001', CustomerNumber: 'C100', CustomerName: 'Acme AB', InvoiceDate: '2024-03-15', DueDate: '2024-04-15', Total: 12500, Currency: 'SEK', Cancelled: false, Booked: true, Sent: true, Balance: 0 },
    { DocumentNumber: '1002', CustomerNumber: 'C200', CustomerName: 'Widget AB', InvoiceDate: '2024-03-20', DueDate: '2024-04-20', Total: 8000, Currency: 'SEK', Cancelled: false, Booked: false, Sent: true, Balance: 8000 },
    { DocumentNumber: '1003', CustomerNumber: 'C100', CustomerName: 'Acme AB', InvoiceDate: '2024-06-01', DueDate: '2024-07-01', Total: 25000, Currency: 'SEK', Cancelled: false, Booked: true, Sent: true, Balance: 0 },
  ];

  const customers = [
    { CustomerNumber: 'C100', Name: 'Acme AB', Email: 'info@acme.se', OrganisationNumber: '5561234567' },
    { CustomerNumber: 'C200', Name: 'Widget AB', Email: 'hello@widget.se', OrganisationNumber: '5567654321' },
  ];

  function toCanonical(raw: Record<string, unknown>, type: EntityType): CanonicalEntityRecord {
    if (type === 'invoice') {
      return {
        external_id: String(raw.DocumentNumber),
        entity_type: 'invoice',
        provider: 'fortnox',
        fiscal_year: 2024,
        document_date: raw.InvoiceDate as string,
        due_date: raw.DueDate as string,
        counterparty_number: raw.CustomerNumber as string,
        counterparty_name: raw.CustomerName as string,
        amount: raw.Total as number,
        currency: 'SEK',
        status: raw.Booked ? 'booked' : 'sent',
        raw_data: raw,
        last_modified: '2024-06-01T12:00:00Z',
        content_hash: contentHash(raw),
      };
    }
    return {
      external_id: String(raw.CustomerNumber),
      entity_type: 'customer',
      provider: 'fortnox',
      fiscal_year: null,
      document_date: null,
      due_date: null,
      counterparty_number: raw.CustomerNumber as string,
      counterparty_name: raw.Name as string,
      amount: null,
      currency: 'SEK',
      status: null,
      raw_data: raw,
      last_modified: '2024-06-01T12:00:00Z',
      content_hash: contentHash(raw),
    };
  }

  // ── V2 DTO builders (inline, matching the shapes from typed-mapper) ──

  function toSalesInvoiceDto(raw: typeof invoices[number]): SalesInvoiceDto {
    const total = raw.Total;
    const balance = raw.Balance;
    const currency = raw.Currency;

    let status: SalesInvoiceDto['status'];
    if (raw.Cancelled) status = 'cancelled';
    else if (balance === 0 && total > 0) status = 'paid';
    else if (raw.Booked) status = 'booked';
    else if (raw.Sent) status = 'sent';
    else status = 'draft';

    return {
      id: raw.DocumentNumber,
      invoiceNumber: raw.DocumentNumber,
      issueDate: raw.InvoiceDate,
      dueDate: raw.DueDate,
      currencyCode: currency,
      status,
      supplier: {
        name: 'Demo AB',
        identifications: [{ id: '5561234567', schemeId: 'SE:ORGNR' }],
        legalEntity: { registrationName: 'Demo AB', companyId: '5561234567', companyIdSchemeId: 'SE:ORGNR' },
      },
      customer: {
        name: raw.CustomerName,
        identifications: [],
        contact: { email: undefined },
      },
      lines: [],
      legalMonetaryTotal: {
        lineExtensionAmount: { value: total, currencyCode: currency },
        taxInclusiveAmount: { value: total, currencyCode: currency },
        payableAmount: { value: total, currencyCode: currency },
      },
      paymentStatus: {
        paid: balance === 0 && total > 0,
        balance: { value: balance, currencyCode: currency },
      },
      _raw: raw as unknown as Record<string, unknown>,
    };
  }

  function toCustomerDto(raw: typeof customers[number]): CustomerDto {
    return {
      id: raw.CustomerNumber,
      customerNumber: raw.CustomerNumber,
      type: 'company',
      party: {
        name: raw.Name,
        identifications: [{ id: raw.OrganisationNumber, schemeId: 'SE:ORGNR' }],
        legalEntity: { registrationName: raw.Name, companyId: raw.OrganisationNumber, companyIdSchemeId: 'SE:ORGNR' },
        contact: { email: raw.Email },
      },
      active: true,
      _raw: raw as unknown as Record<string, unknown>,
    };
  }

  const sieContent = [
    '#FLAGGA 0',
    '#SIETYP 4',
    '#FNAMN "Demo AB"',
    '#RAR 0 20240101 20241231',
    '#KONTO 1910 "Kassa"',
    '#KONTO 1930 "Bankkonto"',
    '#KONTO 3010 "Forsaljning tjanster"',
    '#KONTO 5010 "Lokalhyra"',
    '#KONTO 7210 "Loner"',
    '#IB 0 1910 25000.00',
    '#IB 0 1930 150000.00',
    '#UB 0 1910 30000.00',
    '#UB 0 1930 220000.00',
    '#RES 0 3010 -500000.00',
    '#RES 0 5010 60000.00',
    '#RES 0 7210 280000.00',
    '#VER A 1 20240115 "Kundbetalning"',
    '{',
    '#TRANS 1930 {} 12500.00',
    '#TRANS 1510 {} -12500.00',
    '}',
    '#VER A 2 20240201 "Hyra"',
    '{',
    '#TRANS 5010 {} 5000.00',
    '#TRANS 1930 {} -5000.00',
    '}',
  ].join('\n');

  return {
    name: 'fortnox',
    getCapabilities: () => ({
      name: 'fortnox' as const,
      displayName: 'Fortnox',
      supportedEntityTypes: ['invoice', 'customer'] as EntityType[],
      supportsSIE: true,
      sieTypes: [4] as (1 | 2 | 3 | 4)[],
      supportsIncrementalSync: true,
      incrementalSyncEntities: ['invoice'] as EntityType[],
      authType: 'oauth2' as const,
      rateLimits: { maxRequests: 25, windowMs: 1000 },
    }),
    validateCredentials: async () => true,
    getCompanyInfo: async () => ({
      companyName: 'Demo AB',
      organizationNumber: '5561234567',
      raw: {},
    }),
    getFinancialYears: async () => [
      { id: 1, fromDate: '2024-01-01', toDate: '2024-12-31', year: 2024 },
    ],
    fetchEntities: async (_creds, opts) => {
      const fixtures = opts.entityType === 'invoice' ? invoices : customers;
      const entities = fixtures.map((f) => toCanonical(f as Record<string, unknown>, opts.entityType));
      return { entities, nextCursor: null, totalCount: entities.length, hasMore: false };
    },
    fetchAllEntities: async (_creds, opts) => {
      const fixtures = opts.entityType === 'invoice' ? invoices : customers;
      return fixtures.map((f) => toCanonical(f as Record<string, unknown>, opts.entityType));
    },
    fetchSIE: async () => {
      const { parseSIE } = await import('@arcim-sync/core/sie');
      const { calculateKPIs } = await import('@arcim-sync/core/sie');
      const parsed = parseSIE(sieContent);
      const kpis = calculateKPIs(parsed);
      return {
        files: [{ fiscalYear: 2024, sieType: 4 as const, rawContent: sieContent, parsed, kpis }],
      };
    },

    // ── V2 resource methods ──

    getResourceCapabilities(): ResourceCapabilities {
      return {
        read: [ResourceType.SalesInvoices, ResourceType.Customers],
        write: [],
        subResources: {},
      };
    },

    listResource<T>(
      _credentials: ProviderCredentials,
      resourceType: ResourceType,
      options?: ResourceQueryOptions,
    ): Promise<PaginatedResponse<T>> {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 25;

      if (resourceType === ResourceType.SalesInvoices) {
        const dtos = invoices.map(toSalesInvoiceDto);
        return Promise.resolve({
          data: dtos as T[],
          page,
          pageSize,
          totalCount: dtos.length,
          hasMore: false,
        });
      }
      if (resourceType === ResourceType.Customers) {
        const dtos = customers.map(toCustomerDto);
        return Promise.resolve({
          data: dtos as T[],
          page,
          pageSize,
          totalCount: dtos.length,
          hasMore: false,
        });
      }
      throw new Error(`Unsupported resource type: ${resourceType}`);
    },

    getResource<T>(
      _credentials: ProviderCredentials,
      resourceType: ResourceType,
      resourceId: string,
    ): Promise<T | null> {
      if (resourceType === ResourceType.SalesInvoices) {
        const inv = invoices.find((i) => i.DocumentNumber === resourceId);
        return Promise.resolve(inv ? (toSalesInvoiceDto(inv) as T) : null);
      }
      if (resourceType === ResourceType.Customers) {
        const cust = customers.find((c) => c.CustomerNumber === resourceId);
        return Promise.resolve(cust ? (toCustomerDto(cust) as T) : null);
      }
      throw new Error(`Unsupported resource type: ${resourceType}`);
    },

    createResource<T>(
      _credentials: ProviderCredentials,
      _resourceType: ResourceType,
      data: Partial<T>,
    ): Promise<T> {
      // Echo the input back as a mock create
      return Promise.resolve(data as T);
    },

    listSubResource<T>(): Promise<PaginatedResponse<T>> {
      throw new Error('Sub-resources not supported by mock provider');
    },

    createSubResource<T>(): Promise<T> {
      throw new Error('Sub-resources not supported by mock provider');
    },
  };
}

// ── Boot ──

async function main() {
  const db = new SQLiteAdapter(':memory:');
  await db.migrate();

  registerProvider('fortnox', () => createMockProvider());

  const app = createServer({
    db,
    logger: consoleLogger,
    tokenEncryptionKey: '0123456789abcdef'.repeat(4), // 64 hex chars for AES-256
    mode: 'self-hosted',
    // no apiKey -> all routes open (easy to curl)
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
      ? await new Promise<string>((resolve) => {
          let data = '';
          req.on('data', (chunk: Buffer) => (data += chunk.toString()));
          req.on('end', () => resolve(data));
        })
      : undefined;

    const request = new Request(url, { method: req.method, headers, body });
    const response = await app.fetch(request);

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    const responseBody = await response.text();
    res.end(responseBody);
  });

  server.listen(port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  arcim-sync API running on http://localhost:${port}            ║
║  Mock Fortnox provider loaded (no real credentials needed)  ║
╚══════════════════════════════════════════════════════════════╝

Try these commands:

  curl localhost:${port}/health
  curl localhost:${port}/providers

  # Create a connection
  curl -X POST localhost:${port}/connections \\
    -H 'Content-Type: application/json' \\
    -d '{"connectionId":"demo","provider":"fortnox","displayName":"Demo AB"}'

  # Trigger a sync (invoices + customers + SIE)
  curl -X POST localhost:${port}/sync \\
    -H 'Content-Type: application/json' \\
    -d '{"connectionId":"demo","provider":"fortnox","credentials":{"accessToken":"fake"},"includeSIE":true}'

  # Then poll the job (replace <jobId> with the id from above)
  curl localhost:${port}/sync/<jobId>

  # Browse the synced data
  curl localhost:${port}/entities/demo/invoice
  curl localhost:${port}/entities/demo/customer
  curl localhost:${port}/entities/demo/count
  curl localhost:${port}/sie/demo/uploads

  # Sync history
  curl localhost:${port}/sync/history/demo

# ── V1 Consent API ──────────────────────────────────────────

  # 1. Create a consent
  curl -X POST localhost:${port}/api/v1/consents \\
    -H 'Content-Type: application/json' \\
    -d '{"name":"Acme AB","provider":"fortnox"}'

  # 2. Generate a one-time code (replace <consentId>)
  curl -X POST localhost:${port}/api/v1/consents/<consentId>/otc \\
    -H 'Content-Type: application/json' \\
    -d '{}'

  # 3. Exchange OTC + tokens (replace <consentId> and <code>)
  curl -X POST localhost:${port}/api/v1/consents/auth/token \\
    -H 'Content-Type: application/json' \\
    -d '{"consentId":"<consentId>","code":"<code>","provider":"fortnox","accessToken":"fake-token"}'

  # 4. Browse typed resources (replace <consentId>)
  curl localhost:${port}/api/v1/consents/<consentId>/salesinvoices
  curl localhost:${port}/api/v1/consents/<consentId>/customers
  curl localhost:${port}/api/v1/consents/<consentId>/salesinvoices/1001

Press Ctrl+C to stop.
`);
  });
}

main().catch(console.error);
