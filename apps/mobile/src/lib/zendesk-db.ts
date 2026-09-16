
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
  satisfaction: ZendeskSatisfactionRating[];
  metrics: ZendeskTicketMetric[];
  metricEvents: ZendeskMetricEvent[];
  syncedAt: string | null;
  syncStatus: string;
  lastError?: string | null;
};

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://supportcenter-kappa.vercel.app'
).replace(/\/$/, '');

let memorySnapshot: ZendeskDbSnapshot | null = null;
let memoryAt = 0;
let inflight: Promise<ZendeskDbSnapshot> | null = null;

const MEMORY_TTL_MS = 5 * 60 * 1000;

async function request<T>(
  path: string,
  token: string,
  method = 'GET',
) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const body: any =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Request failed (${response.status})`,
    );
  }

  return body as T;
}

export function peekZendeskDbSnapshot() {
  return memorySnapshot;
}

export function clearZendeskDbSnapshotCache() {
  memorySnapshot = null;
  memoryAt = 0;
  inflight = null;
}

export async function getZendeskDbSnapshot(
  token: string,
  options?: { force?: boolean },
) {
  const force = Boolean(options?.force);

  if (
    !force &&
    memorySnapshot &&
    Date.now() - memoryAt < MEMORY_TTL_MS
  ) {
    return memorySnapshot;
  }

  if (!force && inflight) {
    return inflight;
  }

  inflight = request<ZendeskDbSnapshot>(
    '/api/zendesk-cache-snapshot',
    token,
  );

  try {
    const result = await inflight;
    memorySnapshot = result;
    memoryAt = Date.now();
    return result;
  } finally {
    inflight = null;
  }
}

export async function syncZendeskDb(
  token: string,
) {
  const result = await request<ZendeskDbSnapshot>(
    '/api/zendesk-cache-sync',
    token,
    'POST',
  );

  memorySnapshot = result;
  memoryAt = Date.now();

  return result;
}
