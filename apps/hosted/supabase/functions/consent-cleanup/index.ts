// Supabase Edge Function — Cron: Purge expired consents
// Schedule: daily
// Rules:
// - Created (status=0) with no action for 30 days -> hard delete
// - Revoked (status=2) or Inactive (status=3) for 180 days -> hard delete

Deno.serve(async (_req: Request) => {
  const databaseUrl = Deno.env.get('DATABASE_URL');
  if (!databaseUrl) {
    return new Response(JSON.stringify({ error: 'Missing DATABASE_URL' }), { status: 500 });
  }

  // Use raw postgres for this cron job
  const { default: postgres } = await import('npm:postgres@3.4.5');
  const sql = postgres(databaseUrl);

  try {
    // Delete Created consents older than 30 days
    const createdDeleted = await sql`
      DELETE FROM consents
      WHERE status = 0
        AND created_at < now() - interval '30 days'
      RETURNING id
    `;

    // Delete Revoked/Inactive consents older than 180 days
    const revokedDeleted = await sql`
      DELETE FROM consents
      WHERE status IN (2, 3)
        AND updated_at < now() - interval '180 days'
      RETURNING id
    `;

    await sql.end();

    return new Response(
      JSON.stringify({
        success: true,
        createdDeleted: createdDeleted.length,
        revokedDeleted: revokedDeleted.length,
        timestamp: new Date().toISOString(),
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    await sql.end();
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
