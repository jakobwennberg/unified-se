import type { ProviderName } from '../types/provider.js';
import type { AccountingProvider } from './base.js';

const providerRegistry = new Map<ProviderName, () => AccountingProvider>();

/**
 * Register a provider implementation.
 * Called internally by each provider module on import.
 */
export function registerProvider(
  name: ProviderName,
  factory: () => AccountingProvider,
): void {
  providerRegistry.set(name, factory);
}

/**
 * Get a provider by name.
 * Throws if the provider is not registered.
 */
export function getProvider(name: ProviderName): AccountingProvider {
  const factory = providerRegistry.get(name);
  if (!factory) {
    const available = Array.from(providerRegistry.keys()).join(', ');
    throw new Error(
      `Provider "${name}" is not registered. Available: ${available || 'none'}`,
    );
  }
  return factory();
}

/**
 * List all registered provider names.
 */
export function getRegisteredProviders(): ProviderName[] {
  return Array.from(providerRegistry.keys());
}

export type { AccountingProvider } from './base.js';
export type { AccountingProviderV2, ResourceCapabilities, ResourceQueryOptions } from './base-v2.js';
