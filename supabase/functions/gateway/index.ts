import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth.ts';
import { consentRoutes } from './routes/consents.ts';
import { authRoutes } from './routes/auth.ts';
import { resourceRoutes } from './routes/resources.ts';

const app = new Hono().basePath('/gateway');

// Health check (no auth)
app.get('/health', (c) => c.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// API key auth for all /api/* routes
app.use('/api/*', authMiddleware);

// Consent CRUD
app.route('/api/v1/consents', consentRoutes);

// OAuth flows
app.route('/api/v1/auth', authRoutes);

// Resource proxying — mounted on /api/v1/consents so routes are /:consentId/:resourceType
app.route('/api/v1/consents', resourceRoutes);

Deno.serve(app.fetch);
