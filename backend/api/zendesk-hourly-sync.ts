
import { Client } from 'pg';

type WorkspaceSlug = 'atomos' | 'angelbird';

function zendeskEnv(slug: WorkspaceSlug) {
  const prefix = slug === 'atomos' ? 'ATOMOS' : 'ANGELBIRD';

  return {
    subdomain: String(
      process.env[`${prefix}_ZENDESK_SUBDOMAIN`] || '',
    )
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\.zendesk\.com.*$/i, '')
      .replace(/\/$/, ''),
    email: String(
      process.env[`${prefix}_ZENDESK_EMAIL`] || '',
    ).trim(),
    token: String(
      process.env[`${prefix}_ZENDESK_API_TOKEN`] || '',
    ).trim(),
  };
}

async function connectDb() {
  const raw = String(
    process.env.SUPABASE_DATABASE_URL || '',
  ).trim();

  if (!raw) {
    throw new Error('SUPABASE_DATABASE_URL missing');
  }

  const url = new URL(raw);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');

  const client = new Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

async function zendesk(
  slug: WorkspaceSlug,
  path: string,
) {
  const cfg = zendeskEnv(slug);

  if (!cfg.subdomain || !cfg.email || !cfg.token) {
    throw new Error(`${slug} Zendesk environment incomplete`);
  }

  const auth = `Basic ${Buffer.from(
    `${cfg.email}/token:${cfg.token}`,
  ).toString('base64')}`;

  const response = await fetch(
    `https://${cfg.subdomain}.zendesk.com${path}`,
    {
      headers: {
        Authorization: auth,
        Accept: 'application/json',
      },
    },
  );

  const body: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.error ||
        body?.description ||
        body?.message ||
        `Zendesk HTTP ${response.status}`,
    );
  }

  return body;
}

async function list(
  slug: WorkspaceSlug,
  path: string,
  key: string,
) {
  try {
    const body = await zendesk(slug, path);

    return {
      rows: Array.isArray(body?.[key]) ? body[key] : [],
      error: null as string | null,
    };
  } catch (error: any) {
    return {
      rows: [],
      error: error?.message || 'Zendesk source failed',
    };
  }
}

async function last90DayTickets(slug: WorkspaceSlug) {
  const start = Math.floor(
    (Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000,
  );

  const rows: any[] = [];

  let path =
    `/api/v2/incremental/tickets.json?start_time=${start}`;

  for (let page = 0; page < 100 && path; page += 1) {
    const body = await zendesk(slug, path);

    const current = Array.isArray(body?.tickets)
      ? body.tickets
      : [];

    rows.push(...current);

    if (body?.end_of_stream || !body?.next_page) {
      break;
    }

    const next = new URL(String(body.next_page));
    path = `${next.pathname}${next.search}`;
  }

  const cutoff =
    Date.now() - 90 * 24 * 60 * 60 * 1000;

  return rows.filter((ticket) => {
    const raw = ticket.created_at || ticket.updated_at;
    return raw
      ? new Date(raw).getTime() >= cutoff
      : false;
  });
}

async function syncWorkspace(
  client: Client,
  workspace: WorkspaceSlug,
) {
  const cfg = zendeskEnv(workspace);

  if (!cfg.subdomain || !cfg.email || !cfg.token) {
    return {
      workspace,
      skipped: true,
      reason: 'Zendesk environment incomplete',
    };
  }

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

  return {
    workspace,
    ok: true,
    scopeDays: 90,
    tickets: tickets.length,
    forms: forms.rows.length,
    fields: fields.rows.length,
    agents: agents.rows.length,
    syncedAt: now,
    status: errors.length ? 'partial' : 'ok',
  };
}

export default async function handler(
  req: any,
  res: any,
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const expected = String(
    process.env.CRON_SECRET || '',
  ).trim();

  if (!expected) {
    return res.status(500).json({
      ok: false,
      error: 'CRON_SECRET missing',
    });
  }

  const authorization = String(
    req.headers.authorization || '',
  ).trim();

  if (authorization !== `Bearer ${expected}`) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized',
    });
  }

  let client: Client | null = null;

  try {
    client = await connectDb();

    const results = [];

    for (const workspace of [
      'atomos',
      'angelbird',
    ] as WorkspaceSlug[]) {
      try {
        results.push(
          await syncWorkspace(client, workspace),
        );
      } catch (error: any) {
        results.push({
          workspace,
          ok: false,
          error:
            error?.message ||
            'Workspace sync failed',
        });
      }
    }

    return res.status(200).json({
      ok: true,
      scopeDays: 90,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        'Hourly Zendesk sync failed',
    });
  } finally {
    if (client) {
      await client.end().catch(() => undefined);
    }
  }
}
