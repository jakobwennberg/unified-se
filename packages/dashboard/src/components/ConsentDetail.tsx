import React, { useState } from 'react';
import type { ConsentRecord, ApiClient } from '../types.js';
import { CONSENT_STATUS_LABELS, CONSENT_STATUS_COLORS, PROVIDER_LABELS } from '../types.js';

export interface ConsentDetailProps {
  api: ApiClient;
  consent: ConsentRecord;
  onBack?: () => void;
  onRevoke?: () => void;
}

export function ConsentDetail({ api, consent, onBack, onRevoke }: ConsentDetailProps) {
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to revoke this consent?')) return;
    setRevoking(true);
    try {
      await api.patch(`/api/v1/consents/${consent.id}`, { status: 2 }, consent.etag);
      onRevoke?.();
    } catch (e) {
      alert(`Failed to revoke: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="arcim-consent-detail">
      <div className="arcim-detail-header">
        {onBack && (
          <button onClick={onBack} className="arcim-btn arcim-btn-secondary">
            Back
          </button>
        )}
        <h2>{consent.name}</h2>
        <span
          className="arcim-badge"
          style={{ backgroundColor: CONSENT_STATUS_COLORS[consent.status] }}
        >
          {CONSENT_STATUS_LABELS[consent.status]}
        </span>
      </div>

      <div className="arcim-detail-grid">
        <div className="arcim-detail-field">
          <label>ID</label>
          <span className="arcim-mono">{consent.id}</span>
        </div>
        <div className="arcim-detail-field">
          <label>Provider</label>
          <span>{PROVIDER_LABELS[consent.provider] ?? consent.provider}</span>
        </div>
        <div className="arcim-detail-field">
          <label>Company</label>
          <span>{consent.companyName ?? '—'}</span>
        </div>
        <div className="arcim-detail-field">
          <label>Org Number</label>
          <span>{consent.orgNumber ?? '—'}</span>
        </div>
        <div className="arcim-detail-field">
          <label>Created</label>
          <span>{new Date(consent.createdAt).toLocaleString()}</span>
        </div>
        <div className="arcim-detail-field">
          <label>Updated</label>
          <span>{new Date(consent.updatedAt).toLocaleString()}</span>
        </div>
      </div>

      {consent.status === 1 && (
        <div className="arcim-detail-actions">
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="arcim-btn arcim-btn-danger"
          >
            {revoking ? 'Revoking...' : 'Revoke Consent'}
          </button>
        </div>
      )}
    </div>
  );
}
