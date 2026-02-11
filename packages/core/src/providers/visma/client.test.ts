import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VismaClient, VismaApiError } from './client.js';

const originalFetch = globalThis.fetch;

function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockBinaryResponse(data: Buffer, status = 200) {
  return new Response(data, {
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

describe('VismaClient', () => {
  let client: VismaClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    client = new VismaClient('https://api.test.visma.com/v2');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('sends correct headers and returns parsed JSON', async () => {
      const data = { Name: 'Test AB', CorporateIdentityNumber: '5561234567' };
      fetchMock.mockResolvedValueOnce(mockResponse(data));

      const result = await client.get('test-token', '/companysettings');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://api.test.visma.com/v2/companysettings');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      expect(init.headers.Accept).toBe('application/json');
      expect(result).toEqual(data);
    });

    it('throws VismaApiError on 401 without retry', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );

      await expect(client.get('bad-token', '/test')).rejects.toThrow(VismaApiError);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('retries on 429 then succeeds', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Rate limited', { status: 429 }),
      );
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

      const result = await client.get('token', '/test');
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries on 500 then succeeds', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Server Error', { status: 500 }),
      );
      fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));

      const result = await client.get('token', '/test');
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting retries on 500', async () => {
      fetchMock.mockResolvedValue(
        new Response('Server Error', { status: 500 }),
      );

      await expect(client.get('token', '/test')).rejects.toThrow(VismaApiError);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getPaginated', () => {
    it('collects items across multiple pages via OData $top/$skip', async () => {
      // Page 1
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 1, PageSize: 2, TotalNumberOfPages: 3, TotalNumberOfResults: 6 },
          Data: [{ InvoiceNumber: 1 }, { InvoiceNumber: 2 }],
        }),
      );
      // Page 2
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 2, PageSize: 2, TotalNumberOfPages: 3, TotalNumberOfResults: 6 },
          Data: [{ InvoiceNumber: 3 }, { InvoiceNumber: 4 }],
        }),
      );
      // Page 3
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 3, PageSize: 2, TotalNumberOfPages: 3, TotalNumberOfResults: 6 },
          Data: [{ InvoiceNumber: 5 }, { InvoiceNumber: 6 }],
        }),
      );

      const items = await client.getPaginated<Record<string, unknown>>(
        'token',
        '/customerinvoices',
        { pageSize: 2 },
      );

      expect(items).toHaveLength(6);
      expect(items[0]).toEqual({ InvoiceNumber: 1 });
      expect(items[5]).toEqual({ InvoiceNumber: 6 });
    });

    it('passes OData $filter for incremental sync', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 1, PageSize: 100, TotalNumberOfPages: 1, TotalNumberOfResults: 1 },
          Data: [{ InvoiceNumber: 1 }],
        }),
      );

      await client.getPaginated('token', '/customerinvoices', {
        modifiedSince: '2024-03-01T00:00:00Z',
        modifiedField: 'ModifiedUtc',
      });

      const url = fetchMock.mock.calls[0]![0] as string;
      expect(url).toContain('%24filter=ModifiedUtc+gt+2024-03-01T00%3A00%3A00Z');
    });

    it('handles single page response', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 1, PageSize: 100, TotalNumberOfPages: 1, TotalNumberOfResults: 1 },
          Data: [{ CustomerNumber: 'C1' }],
        }),
      );

      const items = await client.getPaginated('token', '/customers');
      expect(items).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('handles empty response', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          Meta: { CurrentPage: 1, PageSize: 100, TotalNumberOfPages: 0, TotalNumberOfResults: 0 },
          Data: [],
        }),
      );

      const items = await client.getPaginated('token', '/customerinvoices');
      expect(items).toHaveLength(0);
    });
  });

  describe('getBinary', () => {
    it('fetches via TemporaryUrl and returns Buffer', async () => {
      // Step 1: GET /sie4export returns TemporaryUrl
      fetchMock.mockResolvedValueOnce(
        mockResponse({ TemporaryUrl: 'https://storage.visma.com/sie/temp-abc123' }),
      );
      // Step 2: Download from TemporaryUrl
      const sieContent = Buffer.from('#FLAGGA 0\n#SIETYP 4\n', 'utf8');
      fetchMock.mockResolvedValueOnce(mockBinaryResponse(sieContent));

      const result = await client.getBinary('token', '/sie4export/2024-01-01/2024-12-31');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toContain('#FLAGGA');

      // Verify first call was to export endpoint
      expect(fetchMock.mock.calls[0]![0]).toBe(
        'https://api.test.visma.com/v2/sie4export/2024-01-01/2024-12-31',
      );
      // Verify second call was to temp URL
      expect(fetchMock.mock.calls[1]![0]).toBe(
        'https://storage.visma.com/sie/temp-abc123',
      );
    });

    it('throws when TemporaryUrl is missing', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({}));

      await expect(
        client.getBinary('token', '/sie4export/2024-01-01/2024-12-31'),
      ).rejects.toThrow('No TemporaryUrl');
    });
  });
});
