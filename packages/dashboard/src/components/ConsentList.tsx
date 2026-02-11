import React, { useState } from 'react';
import type { ConsentRecord, ApiClient } from '../types.js';
import { CONSENT_STATUS_LABELS, CONSENT_STATUS_COLORS, PROVIDER_LABELS } from '../types.js';
import { useAsync } from '../hooks/use-api.js';

export interface ConsentListProps {
  api: ApiClient;
  onSelect?: (consent: ConsentRecord) => void;
}

export function ConsentList({ api, onSelect }: ConsentListProps) {
  const { data, loading, error, refetch } = useAsync(
    () => api.get<{ data: ConsentRecord[] }>('/api/v1/consents').then((r) => r.data),
    [api],
  );

  if (loading) return <div className="arcim-loading">Loading consents...</div>;
  if (error) return <div className="arcim-error">Error: {error}</div>;

  const consents = data ?? [];

  return (
    <div className="arcim-consent-list">
      <div className="arcim-consent-list-header">
        <h2>Consents</h2>
        <span className="arcim-consent-count">{consents.length} total</span>
      </div>
      {consents.length === 0 ? (
        <div className="arcim-empty">No consents yet. Create one to get started.</div>
      ) : (
        <table className="arcim-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Provider</th>
              <th>Company</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {consents.map((consent) => (
              <tr
                key={consent.id}
                onClick={() => onSelect?.(consent)}
                className="arcim-clickable"
              >
                <td>{consent.name}</td>
                <td>{PROVIDER_LABELS[consent.provider] ?? consent.provider}</td>
                <td>{consent.companyName ?? consent.orgNumber ?? '—'}</td>
                <td>
                  <span
                    className="arcim-badge"
                    style={{ backgroundColor: CONSENT_STATUS_COLORS[consent.status] }}
                  >
                    {CONSENT_STATUS_LABELS[consent.status] ?? 'Unknown'}
                  </span>
                </td>
                <td>{new Date(consent.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
