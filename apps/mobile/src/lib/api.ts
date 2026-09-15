import type { Session } from '@/types/workspace';
import {
  cacheGet,
  cacheSet,
  markStaleFallback,
} from '@/lib/cache';

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://10.0.2.2:3000'
).replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  retryAfterMs?: number;

  constructor(
    message: string,
    status = 500,
    retryAfterMs?: number,
  ) {
    super(message);
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined;

  const seconds = Number(value);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const absolute = new Date(value).getTime();

  if (Number.isFinite(absolute)) {
    return Math.max(0, absolute - Date.now());
  }

  return undefined;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retries = 2,
): Promise<T> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      let response: Response;

      try {
        response = await fetch(`${BASE_URL}${path}`, {
          ...init,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      const body = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        const raw = Array.isArray(body?.message)
          ? body.message.join(', ')
          : body?.message ||
            body?.error ||
            body?.description ||
            'Request failed';

        const retryAfterMs = parseRetryAfter(
          response.headers.get('retry-after'),
        );

        const retryable =
          response.status === 429 ||
          response.status === 408 ||
          response.status >= 500;

        if (retryable && attempt < retries) {
          const delay =
            retryAfterMs ??
            Math.min(4000, 600 * 2 ** attempt);

          await sleep(delay);
          attempt += 1;
          continue;
        }

        throw new ApiError(
          raw,
          response.status,
          retryAfterMs,
        );
      }

      return body as T;
    } catch (error) {
      lastError = error;

      if (
        error instanceof ApiError &&
        ![
          408,
          429,
          500,
          502,
          503,
          504,
        ].includes(error.status)
      ) {
        throw error;
      }

      if (attempt >= retries) {
        throw error;
      }

      await sleep(
        Math.min(4000, 600 * 2 ** attempt),
      );

      attempt += 1;
    }
  }

  throw lastError;
}

async function cachedRequest<T>(
  cacheKey: string,
  path: string,
  init: RequestInit,
  ttlMs: number,
): Promise<T> {
  const cached = await cacheGet<T>(cacheKey);

  if (cached.hit && cached.data !== undefined) {
    return cached.data;
  }

  try {
    const data = await request<T>(path, init, 2);
    await cacheSet(cacheKey, data, ttlMs);
    return data;
  } catch (error) {
    const stale = await cacheGet<T>(
      cacheKey,
      true,
    );

    if (stale.hit && stale.data !== undefined) {
      await markStaleFallback(cacheKey);
      return stale.data;
    }

    throw error;
  }
}

function auth(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function login(
  email: string,
  password: string,
): Promise<Session> {
  return request<Session>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    },
    0,
  );
}

export async function refreshSession(
  refreshToken: string,
): Promise<Session> {
  return request<Session>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
    0,
  );
}

export async function logout(
  accessToken: string,
  refreshToken: string,
): Promise<void> {
  await request(
    '/auth/logout',
    {
      method: 'POST',
      headers: auth(accessToken),
      body: JSON.stringify({ refreshToken }),
    },
    0,
  );
}

export async function me(accessToken: string) {
  return request('/auth/me', {
    headers: auth(accessToken),
  });
}

export type ZendeskView = {
  id: number;
  title: string;
  active?: boolean;
};

export type ZendeskTicket = {
  id: number;
  subject?: string | null;
  description?: string | null;
  status?: string;
  priority?: string | null;
  type?: string | null;
  created_at?: string;
  updated_at?: string;
  requester_id?: number;
  submitter_id?: number;
  assignee_id?: number | null;
  group_id?: number | null;
  organization_id?: number | null;
  ticket_form_id?: number | null;
  tags?: string[];
  custom_fields?: Array<{
    id: number;
    value: unknown;
  }>;
};

export type ZendeskComment = {
  id: number;
  body?: string;
  html_body?: string;
  plain_body?: string;
  public?: boolean;
  author_id?: number;
  created_at?: string;
};

export type ZendeskForm = {
  id: number;
  name: string;
  display_name?: string;
  active?: boolean;
  position?: number;
};

export type ZendeskFieldOption = {
  id?: number;
  name: string;
  raw_name?: string;
  value: string;
};

export type ZendeskTicketField = {
  id: number;
  title: string;
  raw_title?: string;
  description?: string;
  type?: string;
  active?: boolean;
  position?: number;
  custom_field_options?: ZendeskFieldOption[];
};

export type ZendeskGroup = {
  id: number;
  name: string;
  deleted?: boolean;
};

export type ZendeskUser = {
  id: number;
  name: string;
  email?: string;
  role?: string;
  active?: boolean;
};

export type ZendeskSatisfactionRating = {
  id: number;
  score?: string;
  comment?: string | null;
  ticket_id?: number;
  assignee_id?: number | null;
  group_id?: number | null;
  requester_id?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ZendeskTicketDetail = {
  ticket: ZendeskTicket;
  comments: ZendeskComment[];
};

export type ZendeskHealth = {
  ok: boolean;
  workspace: string;
  account?: string | null;
};

const TTL = {
  health: 30_000,
  views: 2 * 60_000,
  tickets: 60_000,
  analytics: 5 * 60_000,
  metadata: 15 * 60_000,
  satisfaction: 5 * 60_000,
  detail: 45_000,
};

export function zendeskHealth(accessToken: string) {
  return cachedRequest<ZendeskHealth>(
    'zendesk:health',
    '/zendesk/health',
    {
      headers: auth(accessToken),
    },
    TTL.health,
  );
}

export function zendeskViews(accessToken: string) {
  return cachedRequest<{ views: ZendeskView[] }>(
    'zendesk:views',
    '/zendesk/views',
    {
      headers: auth(accessToken),
    },
    TTL.views,
  );
}

export function zendeskViewTickets(
  accessToken: string,
  viewId: number,
) {
  return cachedRequest<{
    tickets: ZendeskTicket[];
  }>(
    `zendesk:view:${viewId}:tickets`,
    `/zendesk/views/${viewId}/tickets`,
    {
      headers: auth(accessToken),
    },
    TTL.tickets,
  );
}

export function zendeskRecentTickets(
  accessToken: string,
) {
  return cachedRequest<{
    tickets: ZendeskTicket[];
  }>(
    'zendesk:tickets:recent',
    '/zendesk/tickets',
    {
      headers: auth(accessToken),
    },
    TTL.tickets,
  );
}

export function zendeskAnalyticsTickets(
  accessToken: string,
  days = 30,
) {
  return cachedRequest<{
    days: number;
    tickets: ZendeskTicket[];
    count: number;
    limited: boolean;
  }>(
    `zendesk:analytics:${days}`,
    `/zendesk/analytics/tickets?days=${days}`,
    {
      headers: auth(accessToken),
    },
    TTL.analytics,
  );
}

export function zendeskSatisfaction(
  accessToken: string,
  days = 30,
) {
  return cachedRequest<{
    days: number;
    ratings: ZendeskSatisfactionRating[];
    count: number;
  }>(
    `zendesk:satisfaction:${days}`,
    `/zendesk/satisfaction?days=${days}`,
    {
      headers: auth(accessToken),
    },
    TTL.satisfaction,
  );
}

export function zendeskForms(accessToken: string) {
  return cachedRequest<{
    ticket_forms: ZendeskForm[];
  }>(
    'zendesk:forms',
    '/zendesk/forms',
    {
      headers: auth(accessToken),
    },
    TTL.metadata,
  );
}

export function zendeskFields(accessToken: string) {
  return cachedRequest<{
    ticket_fields: ZendeskTicketField[];
  }>(
    'zendesk:fields',
    '/zendesk/fields',
    {
      headers: auth(accessToken),
    },
    TTL.metadata,
  );
}

export function zendeskGroups(accessToken: string) {
  return cachedRequest<{
    groups: ZendeskGroup[];
  }>(
    'zendesk:groups',
    '/zendesk/groups',
    {
      headers: auth(accessToken),
    },
    TTL.metadata,
  );
}

export function zendeskAgents(accessToken: string) {
  return cachedRequest<{
    users: ZendeskUser[];
  }>(
    'zendesk:agents',
    '/zendesk/agents',
    {
      headers: auth(accessToken),
    },
    TTL.metadata,
  );
}

export function zendeskTicket(
  accessToken: string,
  id: number,
) {
  return cachedRequest<ZendeskTicketDetail>(
    `zendesk:ticket:${id}`,
    `/zendesk/tickets/${id}`,
    {
      headers: auth(accessToken),
    },
    TTL.detail,
  );
}
