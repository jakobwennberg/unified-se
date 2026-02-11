import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiClient } from '../types.js';

export function createApiClient(baseUrl: string, apiKey?: string): ApiClient {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return {
    baseUrl,
    headers,
    async get<T>(path: string): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, { headers });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    async post<T>(path: string, body?: unknown): Promise<T> {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    async patch<T>(path: string, body: unknown, etag?: string): Promise<T> {
      const patchHeaders = { ...headers };
      if (etag) patchHeaders['If-Match'] = etag;
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    async delete(path: string): Promise<void> {
      const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
    },
  };
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mounted.current) setData(result);
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, loading, error, refetch: execute };
}
