
import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { Client } from 'pg';

type Slug = 'atomos' | 'angelbird';

function config(slug: Slug) {
  const prefix =
    slug === 'atomos'
      ? 'ATOMOS'
      : 'ANGELBIRD';

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

async function zendesk(
  slug: Slug,
  path: string,
) {
  const cfg = config(slug);

  if (
    !cfg.subdomain ||
    !cfg.email ||
    !cfg.token
  ) {
    throw new Error(
      `${slug}: Zendesk environment incomplete`,
    );
  }

  const authorization =
    `Basic ${Buffer.from(
      `${cfg.email}/token:${cfg.token}`,
    ).toString('base64')}`;

  const response = await fetch(
    `https://${cfg.subdomain}.zendesk.com${path}`,
    {
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
    },
  );

  const body: any =
    await response
      .json()
      .catch(() => ({}));

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

async function ticketRows(
  slug: Slug,
) {
  const from = new Date(
    Date.now() -
      90 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const query =
    encodeURIComponent(
      `type:ticket created>=${from}`,
    );

  const rows: any[] = [];

  for (
    let page = 1;
    page <= 10;
    page += 1
  ) {
    const body = await zendesk(
      slug,
      `/api/v2/search.json?query=${query}&sort_by=created_at&sort_order=desc&per_page=100&page=${page}`,
    );

    const pageRows =
      Array.isArray(body?.results)
        ? body.results
        : [];

    rows.push(...pageRows);

    if (
      pageRows.length < 100 ||
      !body?.next_page
    ) {
      break;
    }
  }

  return rows;
}

async function list(
  slug: Slug,
  path: string,
  key: string,
) {
  try {
    const body =
      await zendesk(slug, path);

    return {
      rows: Array.isArray(body?.[key])
        ? body[key]
        : [],
      error: null,
    };
  } catch (error: any) {
    return {
      rows: [],
      error:
        error?.message ||
        'Source failed',
    };
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  const secret = String(
    process.env.CRON_SECRET || '',
  ).trim();

  if (secret) {
    const supplied = String(
      req.headers.authorization || '',
    );

    if (
      supplied !==
      `Bearer ${secret}`
    ) {
      return res
        .status(401)
        .json({ ok: false });
    }
  }

  const raw = String(
    process.env
      .SUPABASE_DATABASE_URL || '',
  ).trim();

  if (!raw) {
    return res.status(500).json({
      ok: false,
      error:
        'SUPABASE_DATABASE_URL missing',
    });
  }

  const url = new URL(raw);
  url.searchParams.delete('sslmode');
  url.searchParams.delete(
    'uselibpqcompat',
  );

  const db = new Client({
    connectionString:
      url.toString(),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await db.connect();

  const results:
    Record<string, any> = {};

  try {
    for (
      const slug of [
        'atomos',
        'angelbird',
      ] as Slug[]
    ) {
      const cfg = config(slug);

      if (
        !cfg.subdomain ||
        !cfg.email ||
        !cfg.token
      ) {
        results[slug] = {
          skipped: true,
          reason:
            'Zendesk env incomplete',
        };
        continue;
      }

      try {
        const [
          tickets,
          forms,
          fields,
          groups,
          agents,
          satisfaction,
          metrics,
        ] = await Promise.all([
          ticketRows(slug),
          list(
            slug,
            '/api/v2/ticket_forms.json?active=true',
            'ticket_forms',
          ),
          list(
            slug,
            '/api/v2/ticket_fields.json',
            'ticket_fields',
          ),
          list(
            slug,
            '/api/v2/groups.json?per_page=100',
            'groups',
          ),
          list(
            slug,
            '/api/v2/users.json?role[]=agent&role[]=admin&per_page=100',
            'users',
          ),
          list(
            slug,
            '/api/v2/satisfaction_ratings.json?per_page=100',
            'satisfaction_ratings',
          ),
          list(
            slug,
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

        const now =
          new Date().toISOString();

        await db.query(
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
             synced_at=excluded.synced_at,
             sync_status=excluded.sync_status,
             last_error=excluded.last_error,
             updated_at=now()`,
          [
            slug,
            JSON.stringify(tickets),
            JSON.stringify(forms.rows),
            JSON.stringify(fields.rows),
            JSON.stringify(groups.rows),
            JSON.stringify(agents.rows),
            JSON.stringify(
              satisfaction.rows,
            ),
            JSON.stringify(metrics.rows),
            now,
            errors.length
              ? 'partial'
              : 'ok',
            errors.length
              ? errors
                  .join(' | ')
                  .slice(0, 2000)
              : null,
          ],
        );

        results[slug] = {
          ok: true,
          scopeDays: 90,
          tickets:
            tickets.length,
          forms:
            forms.rows.length,
          fields:
            fields.rows.length,
          syncedAt: now,
        };
      } catch (error: any) {
        results[slug] = {
          ok: false,
          error:
            error?.message ||
            'Sync failed',
        };
      }
    }
  } finally {
    await db.end();
  }

  return res.status(200).json({
    ok: true,
    scopeDays: 90,
    timestamp:
      new Date().toISOString(),
    results,
  });
}
