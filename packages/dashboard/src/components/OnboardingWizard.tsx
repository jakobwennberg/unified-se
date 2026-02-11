import React, { useState } from 'react';
import type { ApiClient } from '../types.js';
import { PROVIDER_LABELS } from '../types.js';

export interface OnboardingWizardProps {
  api: ApiClient;
  /** Pre-selected consent ID and OTC (for link/iframe mode) */
  consentId?: string;
  otcCode?: string;
  /** Available providers */
  providers?: string[];
  /** Callback when onboarding is complete */
  onComplete?: (consentId: string) => void;
  /** OAuth redirect URI to use */
  oauthRedirectUri?: string;
}

type Step = 'select-provider' | 'connect' | 'success';

export function OnboardingWizard({
  api,
  consentId: initialConsentId,
  otcCode,
  providers = ['fortnox', 'visma'],
  onComplete,
  oauthRedirectUri,
}: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(initialConsentId ? 'connect' : 'select-provider');
  const [provider, setProvider] = useState<string | null>(null);
  const [consentId, setConsentId] = useState(initialConsentId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleProviderSelect = async (selectedProvider: string) => {
    setProvider(selectedProvider);
    setLoading(true);
    setError(null);

    try {
      // Create consent if we don't have one
      if (!consentId) {
        const result = await api.post<{ id: string }>('/api/v1/consents', {
          name: `${PROVIDER_LABELS[selectedProvider] ?? selectedProvider} connection`,
          provider: selectedProvider,
        });
        setConsentId(result.id);
      }
      setStep('connect');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthStart = () => {
    // Redirect to provider OAuth
    const params = new URLSearchParams({
      redirectUri: oauthRedirectUri ?? window.location.href,
      state: JSON.stringify({ consentId, otcCode }),
    });
    window.location.href = `${api.baseUrl}/auth/${provider}/url?${params.toString()}`;
  };

  return (
    <div className="arcim-onboarding">
      {error && <div className="arcim-error">{error}</div>}

      {step === 'select-provider' && (
        <div className="arcim-step">
          <h2>Connect your accounting system</h2>
          <p>Select your accounting software to get started.</p>
          <div className="arcim-provider-grid">
            {providers.map((p) => (
              <button
                key={p}
                onClick={() => handleProviderSelect(p)}
                disabled={loading}
                className="arcim-provider-card"
              >
                <span className="arcim-provider-name">
                  {PROVIDER_LABELS[p] ?? p}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'connect' && (
        <div className="arcim-step">
          <h2>Authorize access</h2>
          <p>
            Click below to securely connect to{' '}
            {PROVIDER_LABELS[provider ?? ''] ?? provider}.
            You will be redirected to authorize access.
          </p>
          <button
            onClick={handleOAuthStart}
            className="arcim-btn arcim-btn-primary"
          >
            Connect to {PROVIDER_LABELS[provider ?? ''] ?? provider}
          </button>
        </div>
      )}

      {step === 'success' && (
        <div className="arcim-step">
          <h2>Connected!</h2>
          <p>Your accounting system has been connected successfully.</p>
          {onComplete && (
            <button
              onClick={() => onComplete(consentId)}
              className="arcim-btn arcim-btn-primary"
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  );
}
