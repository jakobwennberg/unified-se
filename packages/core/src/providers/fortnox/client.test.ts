import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FortnoxClient, FortnoxApiError } from './client.js';

const originalFetch = globalThis.fetch;

function mockResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function mockBinaryResponse(data: Buffer, status = 200) {
  return new Response(data, {
    status,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/octet-stream' },
  });
}

describe('FortnoxClient', () => {
  let client: FortnoxClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    client = new FortnoxClient('https://api.test.fortnox.se/3');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('get', () => {
    it('sends correct headers', async () => {
      fetchMock.mockResolvedValueOnce(mockResponse({ CompanyInformation: {} }));

      await client.get('test-token', '/companyinformation');

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe('https://api.test.fortnox.se/3/companyinformation');
      expect(init.headers.Authorization).toBe('Bearer test-token');
      expect(init.headers.Accept).toBe('application/json');
    });

    it('returns parsed JSON', async () => {
      const data = { CompanyInformation: { CompanyName: 'Test AB' } };
      fetchMock.mockResolvedValueOnce(mockResponse(data));

      const result = await client.get('token', '/companyinformation');
      expect(result).toEqual(data);
    });

    it('throws FortnoxApiError on 401 without retry', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 }),
      );

      await expect(client.get('bad-token', '/test')).rejects.toThrow(FortnoxApiError);
      expect(fetchMock).toHaveBeenCalledOnce(); // No retries
    });

    it('throws FortnoxApiError on 403 without retry', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Forbidden', { status: 403 }),
      );

      await expect(client.get('token', '/test')).rejects.toThrow(FortnoxApiError);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('throws FortnoxApiError on 404 without retry', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );

      await expect(client.get('token', '/test')).rejects.toThrow(FortnoxApiError);
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

      await expect(client.get('token', '/test')).rejects.toThrow(FortnoxApiError);
      expect(fetchMock).toHaveBeenCalledTimes(3); // 3 attempts
    });
  });

  describe('getPaginated', () => {
    it('collects items across multiple pages', async () => {
      // Page 1
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalResources': 6, '@TotalPages': 3, '@CurrentPage': 1 },
          Invoices: [{ DocumentNumber: '1' }, { DocumentNumber: '2' }],
        }),
      );
      // Page 2
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalResources': 6, '@TotalPages': 3, '@CurrentPage': 2 },
          Invoices: [{ DocumentNumber: '3' }, { DocumentNumber: '4' }],
        }),
      );
      // Page 3
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalResources': 6, '@TotalPages': 3, '@CurrentPage': 3 },
          Invoices: [{ DocumentNumber: '5' }, { DocumentNumber: '6' }],
        }),
      );

      const items = await client.getPaginated<Record<string, unknown>>(
        'token',
        '/invoices',
        'Invoices',
      );

      expect(items).toHaveLength(6);
      expect(items[0]).toEqual({ DocumentNumber: '1' });
      expect(items[5]).toEqual({ DocumentNumber: '6' });
    });

    it('passes lastmodified query param', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalPages': 1, '@CurrentPage': 1 },
          Invoices: [{ DocumentNumber: '1' }],
        }),
      );

      await client.getPaginated('token', '/invoices', 'Invoices', {
        lastModified: '2024-03-01',
      });

      const url = fetchMock.mock.calls[0]![0] as string;
      expect(url).toContain('lastmodified=2024-03-01');
    });

    it('handles single page response', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalPages': 1, '@CurrentPage': 1 },
          Customers: [{ CustomerNumber: 'C1' }],
        }),
      );

      const items = await client.getPaginated('token', '/customers', 'Customers');
      expect(items).toHaveLength(1);
    });

    it('handles empty list', async () => {
      fetchMock.mockResolvedValueOnce(
        mockResponse({
          MetaInformation: { '@TotalPages': 0, '@CurrentPage': 0 },
          Invoices: [],
        }),
      );

      const items = await client.getPaginated('token', '/invoices', 'Invoices');
      expect(items).toHaveLength(0);
    });
  });

  describe('getBinary', () => {
    it('returns Buffer', async () => {
      const data = Buffer.from('#FLAGGA 0\n#SIETYP 4\n', 'utf8');
      fetchMock.mockResolvedValueOnce(mockBinaryResponse(data));

      const result = await client.getBinary('token', '/sie/4');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.toString('utf8')).toContain('#FLAGGA');
    });

    it('throws on error response', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response('Not Found', { status: 404 }),
      );

      await expect(client.getBinary('token', '/sie/4')).rejects.toThrow(FortnoxApiError);
    });
  });
});
