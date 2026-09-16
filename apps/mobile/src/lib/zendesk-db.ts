
import type {
  ZendeskForm,
  ZendeskGroup,
  ZendeskMetricEvent,
  ZendeskSatisfactionRating,
  ZendeskTicket,
  ZendeskTicketField,
  ZendeskTicketMetric,
  ZendeskUser,
} from '@/lib/api';

export type ZendeskDbSnapshot = {
  workspace: string;
  scopeDays: number;
  tickets: ZendeskTicket[];
  forms: ZendeskForm[];
  fields: ZendeskTicketField[];
  groups: ZendeskGroup[];
  agents: ZendeskUser[];
  satisfaction:
    ZendeskSatisfactionRating[];
  metrics: ZendeskTicketMetric[];
  metricEvents: ZendeskMetricEvent[];
  syncedAt: string | null;
  syncStatus: string;
  lastError?: string | null;
};

const BASE_URL = (
  process.env
    .EXPO_PUBLIC_API_BASE_URL ||
  'https://supportcenter-kappa.vercel.app'
).replace(/\/$/, '');

async function request<T>(
  path: string,
  token: string,
  method = 'GET',
) {
  const response = await fetch(
    `${BASE_URL}${path}`,
    {
      method,
      headers: {
        Authorization:
          `Bearer ${token}`,
        'Content-Type':
          'application/json',
      },
    },
  );

  const body: any =
    await response
      .json()
      .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Request failed (${response.status})`,
    );
  }

  return body as T;
}

export function getZendeskDbSnapshot(
  token: string,
) {
  return request<ZendeskDbSnapshot>(
    '/zendesk/cache/snapshot',
    token,
  );
}

export function syncZendeskDb(
  token: string,
) {
  return request<ZendeskDbSnapshot>(
    '/zendesk/cache/sync',
    token,
    'POST',
  );
}
