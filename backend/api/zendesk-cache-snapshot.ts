
import {
  bearer,
  connectDb,
  resolveWorkspaceSlug,
  verifyAccess,
} from './_support-cache-common';

export default async function handler(
  req: any,
  res: any,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = bearer(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let client;

  try {
    const payload = verifyAccess(token);
    client = await connectDb();

    const workspace =
      await resolveWorkspaceSlug(client, payload);

    const result = await client.query(
      `select
         workspace_slug,
         tickets,
         forms,
         fields,
         groups,
         agents,
         satisfaction,
         metrics,
         metric_events,
         synced_at,
         sync_status,
         last_error
       from public.zendesk_cache_snapshots
       where workspace_slug=$1
       limit 1`,
      [workspace],
    );

    const row = result.rows[0];

    return res.status(200).json(
      row
        ? {
            workspace: row.workspace_slug,
            scopeDays: 90,
            tickets: row.tickets || [],
            forms: row.forms || [],
            fields: row.fields || [],
            groups: row.groups || [],
            agents: row.agents || [],
            satisfaction: row.satisfaction || [],
            metrics: row.metrics || [],
            metricEvents: row.metric_events || [],
            syncedAt: row.synced_at || null,
            syncStatus: row.sync_status || 'unknown',
            lastError: row.last_error || null,
          }
        : {
            workspace,
            scopeDays: 90,
            tickets: [],
            forms: [],
            fields: [],
            groups: [],
            agents: [],
            satisfaction: [],
            metrics: [],
            metricEvents: [],
            syncedAt: null,
            syncStatus: 'never',
            lastError: null,
          },
    );
  } catch (error: any) {
    return res.status(500).json({
      error:
        error?.message ||
        'Unable to read support snapshot',
    });
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}
