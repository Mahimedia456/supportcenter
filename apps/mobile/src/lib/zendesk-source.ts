
import * as api from '@/lib/api';
import {
  getZendeskDbSnapshot,
  syncZendeskDb,
} from '@/lib/zendesk-db';

export type ZendeskTicketUniverse = {
  tickets: api.ZendeskTicket[];
  source:
    | 'database'
    | 'all'
    | 'analytics90'
    | 'recent';
  limited: boolean;
  syncedAt?: string | null;
  warning?: string;
};

export async function loadZendeskTicketUniverse(
  token: string,
): Promise<ZendeskTicketUniverse> {
  try {
    const snapshot =
      await getZendeskDbSnapshot(token);

    if (
      snapshot.tickets.length ||
      snapshot.syncedAt
    ) {
      return {
        tickets: snapshot.tickets,
        source: 'database',
        limited: false,
        syncedAt: snapshot.syncedAt,
        warning:
          snapshot.syncStatus === 'partial'
            ? snapshot.lastError || undefined
            : undefined,
      };
    }
  } catch {
    // Fall through to live Zendesk for compatibility.
  }

  try {
    const result =
      await api.zendeskAllTickets(token);

    return {
      tickets: result.tickets || [],
      source: 'all',
      limited: Boolean(result.limited),
    };
  } catch (allError: any) {
    try {
      const result =
        await api.zendeskAnalyticsTickets(
          token,
          90,
        );

      return {
        tickets: result.tickets || [],
        source: 'analytics90',
        limited: Boolean(result.limited),
        warning:
          allError?.message ||
          'Full history unavailable.',
      };
    } catch (analyticsError: any) {
      const result =
        await api.zendeskRecentTickets(token);

      return {
        tickets: result.tickets || [],
        source: 'recent',
        limited: true,
        warning:
          analyticsError?.message ||
          allError?.message,
      };
    }
  }
}

export async function forceZendeskDbSync(
  token: string,
) {
  return syncZendeskDb(token);
}
