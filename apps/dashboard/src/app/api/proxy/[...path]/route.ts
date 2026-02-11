import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const SERVICE_KEY = process.env.ARCIM_SERVICE_KEY!;

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join('/');
  const url = new URL(targetPath, API_URL.endsWith('/') ? API_URL : API_URL + '/');

  // Forward query params
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const contentType = request.headers.get('Content-Type') || '';
  const isMultipart = contentType.startsWith('multipart/form-data');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  } else {
    // Preserve the full Content-Type with boundary for multipart
    headers['Content-Type'] = contentType;
  }

  // Forward If-Match header for PATCH
  const ifMatch = request.headers.get('If-Match');
  if (ifMatch) {
    headers['If-Match'] = ifMatch;
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      if (isMultipart) {
        // Forward raw binary body for multipart (preserves boundary)
        const buffer = await request.arrayBuffer();
        if (buffer.byteLength > 0) fetchOptions.body = buffer;
      } else {
        const body = await request.text();
        if (body) fetchOptions.body = body;
      }
    } catch {
      // No body
    }
  }

  const response = await fetch(url.toString(), fetchOptions);

  const responseHeaders = new Headers();
  // Forward ETag
  const etag = response.headers.get('ETag');
  if (etag) responseHeaders.set('ETag', etag);
  responseHeaders.set('Content-Type', response.headers.get('Content-Type') || 'application/json');

  const responseBody = await response.text();

  return new NextResponse(responseBody, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const PUT = proxyRequest;
