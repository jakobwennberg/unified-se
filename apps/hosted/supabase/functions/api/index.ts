// Supabase Edge Function — API entry point
// This wraps the Hono app for deployment as a Supabase Edge Function

import app from '../../src/edge-function.js';

Deno.serve(app.fetch);
