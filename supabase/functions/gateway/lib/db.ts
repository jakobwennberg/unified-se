import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

let sql: ReturnType<typeof postgres> | null = null;

export function getDb(): ReturnType<typeof postgres> {
  if (!sql) {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) throw new Error('SUPABASE_DB_URL is required');
    sql = postgres(dbUrl, { max: 1 });
  }
  return sql;
}
