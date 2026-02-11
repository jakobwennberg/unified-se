import React, { useState } from 'react';
import type { ApiClient } from '../types.js';
import { useAsync } from '../hooks/use-api.js';

const RESOURCE_TYPES = [
  { value: 'salesinvoices', label: 'Sales Invoices' },
  { value: 'supplierinvoices', label: 'Supplier Invoices' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
  { value: 'journals', label: 'Journals' },
  { value: 'accountingaccounts', label: 'Accounts' },
  { value: 'companyinformation', label: 'Company Info' },
];

export interface ResourceBrowserProps {
  api: ApiClient;
  consentId: string;
}

export function ResourceBrowser({ api, consentId }: ResourceBrowserProps) {
  const [resourceType, setResourceType] = useState('salesinvoices');
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAsync(
    () =>
      api.get<{ data: unknown[]; totalCount: number; hasMore: boolean }>(
        `/api/v1/consents/${consentId}/${resourceType}?page=${page}&pageSize=20`,
      ),
    [api, consentId, resourceType, page],
  );

  return (
    <div className="arcim-resource-browser">
      <div className="arcim-browser-controls">
        <select
          value={resourceType}
          onChange={(e) => {
            setResourceType(e.target.value);
            setPage(1);
          }}
          className="arcim-select"
        >
          {RESOURCE_TYPES.map((rt) => (
            <option key={rt.value} value={rt.value}>
              {rt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <div className="arcim-loading">Loading...</div>}
      {error && <div className="arcim-error">Error: {error}</div>}

      {data && (
        <>
          <div className="arcim-browser-meta">
            {data.totalCount} results | Page {page}
          </div>
          <pre className="arcim-json">
            {JSON.stringify(data.data, null, 2)}
          </pre>
          <div className="arcim-pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="arcim-btn"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data.hasMore}
              className="arcim-btn"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
