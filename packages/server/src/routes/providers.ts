import { Hono } from 'hono';
import type { Logger } from '@arcim-sync/core';
import { getRegisteredProviders, getProvider } from '@arcim-sync/core';

export function providersRoutes(logger: Logger) {
  const app = new Hono();

  // GET /providers
  app.get('/', (c) => {
    const names = getRegisteredProviders();
    const capabilities = names.map((name) => {
      const provider = getProvider(name);
      return provider.getCapabilities();
    });
    return c.json(capabilities);
  });

  return app;
}
