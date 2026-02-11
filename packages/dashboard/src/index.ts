/**
 * @arcim-sync/dashboard
 *
 * React component library for managing Swedish accounting integrations.
 */

export { ConsentList, type ConsentListProps } from './components/ConsentList.js';
export { ConsentDetail, type ConsentDetailProps } from './components/ConsentDetail.js';
export { ResourceBrowser, type ResourceBrowserProps } from './components/ResourceBrowser.js';
export { OnboardingWizard, type OnboardingWizardProps } from './components/OnboardingWizard.js';
export { createApiClient, useAsync } from './hooks/use-api.js';
export type { ConsentRecord, ApiClient } from './types.js';
export {
  CONSENT_STATUS_LABELS,
  CONSENT_STATUS_COLORS,
  PROVIDER_LABELS,
} from './types.js';
export const VERSION = '0.1.0';
