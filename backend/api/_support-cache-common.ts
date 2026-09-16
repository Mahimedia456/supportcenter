
import { Client } from 'pg';
import jwt from 'jsonwebtoken';

export type WorkspaceSlug = 'atomos' | 'angelbird';

export function bearer(header: unknown) {
  const raw = String(header || '').trim();
  return raw.startsWith('Bearer ') ? raw.slice(7) : '';
}

export function verifyAccess(token: string): any {
  const secret = String(process.env.JWT_ACCESS_SECRET || '').trim();
  if (!secret) throw new Error('JWT_ACCESS_SECRET missing');
  return jwt.verify(token, secret);
}

export async function connectDb() {
  const raw = String(process.env.SUPABASE_DATABASE_URL || '').trim();
  if (!raw) throw new Error('SUPABASE_DATABASE_URL missing');

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

export async function resolveWorkspaceSlug(
  client: Client,
  payload: any,
): Promise<WorkspaceSlug> {
  const direct = String(
    payload?.workspaceSlug ||
    payload?.workspace_slug ||
    payload?.workspace ||
    '',
  ).toLowerCase();

  if (direct === 'atomos' || direct === 'angelbird') {
    return direct;
  }

  const workspaceId =
    payload?.workspaceId ||
    payload?.workspace_id;

  if (workspaceId) {
    const candidates = [
      `select slug from public.workspaces where id=$1 limit 1`,
      `select slug from workspaces where id=$1 limit 1`,
    ];

    for (const sql of candidates) {
      try {
        const result = await client.query(sql, [workspaceId]);
        const slug = String(result.rows[0]?.slug || '').toLowerCase();

        if (slug === 'atomos' || slug === 'angelbird') {
          return slug;
        }
      } catch {}
    }
  }

  const name = String(
    payload?.workspaceName ||
    payload?.workspace_name ||
    payload?.name ||
    '',
  ).toLowerCase();

  if (name.includes('atomos')) return 'atomos';
  if (name.includes('angel')) return 'angelbird';

  throw new Error('Unable to resolve workspace from access token');
}

export function zendeskEnv(slug: WorkspaceSlug) {
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

export async function zendesk(
  slug: WorkspaceSlug,
  path: string,
) {
  const cfg = zendeskEnv(slug);

  if (!cfg.subdomain || !cfg.email || !cfg.token) {
    throw new Error(`${slug} Zendesk API environment incomplete`);
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

export async function list(
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

export async function last90DayTickets(slug: WorkspaceSlug) {
  const start = Math.floor(
    (Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000,
  );

  const rows: any[] = [];
  let path =
    `/api/v2/incremental/tickets.json?start_time=${start}&include=metric_sets`;

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
