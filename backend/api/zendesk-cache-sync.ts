
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  bearer,
  connectDb,
  last90DayTickets,
  list,
  resolveWorkspaceSlug,
  verifyAccess,
} from './_support-cache-common';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
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

    const [
      tickets,
      forms,
      fields,
      groups,
      agents,
      satisfaction,
      metrics,
    ] = await Promise.all([
      last90DayTickets(workspace),
      list(
        workspace,
        '/api/v2/ticket_forms.json?active=true',
        'ticket_forms',
      ),
      list(
        workspace,
        '/api/v2/ticket_fields.json',
        'ticket_fields',
      ),
      list(
        workspace,
        '/api/v2/groups.json?per_page=100',
        'groups',
      ),
      list(
        workspace,
        '/api/v2/users.json?role[]=agent&role[]=admin&per_page=100',
        'users',
      ),
      list(
        workspace,
        '/api/v2/satisfaction_ratings.json?per_page=100',
        'satisfaction_ratings',
      ),
      list(
        workspace,
        '/api/v2/ticket_metrics.json?per_page=100',
        'ticket_metrics',
      ),
    ]);

    const errors = [
      forms.error,
      fields.error,
      groups.error,
      agents.error,
      satisfaction.error,
      metrics.error,
    ].filter(Boolean);

    const now = new Date().toISOString();

    await client.query(
      `insert into public.zendesk_cache_snapshots (
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
         last_error,
         updated_at
       ) values (
         $1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,
         $7::jsonb,$8::jsonb,'[]'::jsonb,$9,$10,$11,now()
       )
       on conflict (workspace_slug)
       do update set
         tickets=excluded.tickets,
         forms=excluded.forms,
         fields=excluded.fields,
         groups=excluded.groups,
         agents=excluded.agents,
         satisfaction=excluded.satisfaction,
         metrics=excluded.metrics,
         metric_events=excluded.metric_events,
         synced_at=excluded.synced_at,
         sync_status=excluded.sync_status,
         last_error=excluded.last_error,
         updated_at=now()`,
      [
        workspace,
        JSON.stringify(tickets),
        JSON.stringify(forms.rows),
        JSON.stringify(fields.rows),
        JSON.stringify(groups.rows),
        JSON.stringify(agents.rows),
        JSON.stringify(satisfaction.rows),
        JSON.stringify(metrics.rows),
        now,
        errors.length ? 'partial' : 'ok',
        errors.length
          ? errors.join(' | ').slice(0, 2000)
          : null,
      ],
    );

    return res.status(200).json({
      workspace,
      scopeDays: 90,
      tickets,
      forms: forms.rows,
      fields: fields.rows,
      groups: groups.rows,
      agents: agents.rows,
      satisfaction: satisfaction.rows,
      metrics: metrics.rows,
      metricEvents: [],
      syncedAt: now,
      syncStatus: errors.length ? 'partial' : 'ok',
      lastError: errors.length ? errors.join(' | ') : null,
    });
  } catch (error: any) {
    return res.status(500).json({
      error:
        error?.message ||
        'Unable to sync support snapshot',
    });
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}
