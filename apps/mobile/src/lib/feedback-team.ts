import type {
  ZendeskForm,
  ZendeskSatisfactionRating,
  ZendeskTicket,
  ZendeskTicketField,
  ZendeskUser,
} from '@/lib/api';
import { dimensionsForTicket } from '@/lib/zendesk-dimensions';

export type FeedbackSummary = {
  total: number;
  good: number;
  bad: number;
  goodPct: number;
  badPct: number;
};

export type AgentRow = {
  id: number;
  name: string;
  email?: string;
  assigned: number;
  open: number;
  pending: number;
  high: number;
  unassigned: number;
  good: number;
  bad: number;
  feedbackTotal: number;
};

function score(value?: string | null) {
  return String(value || '').toLowerCase();
}

export function feedbackSummary(
  ratings: ZendeskSatisfactionRating[],
): FeedbackSummary {
  const good = ratings.filter((r) => score(r.score) === 'good').length;
  const bad = ratings.filter((r) => score(r.score) === 'bad').length;
  const total = good + bad;

  return {
    total,
    good,
    bad,
    goodPct: total ? Math.round((good / total) * 100) : 0,
    badPct: total ? Math.round((bad / total) * 100) : 0,
  };
}

export function ticketMap(tickets: ZendeskTicket[]) {
  return new Map(tickets.map((t) => [t.id, t]));
}

export function buildAgentRows(
  agents: ZendeskUser[],
  tickets: ZendeskTicket[],
  ratings: ZendeskSatisfactionRating[],
): AgentRow[] {
  const ratingByAgent = new Map<
    number,
    { good: number; bad: number }
  >();

  for (const rating of ratings) {
    if (!rating.assignee_id) continue;

    const row = ratingByAgent.get(rating.assignee_id) || {
      good: 0,
      bad: 0,
    };

    if (score(rating.score) === 'good') row.good += 1;
    if (score(rating.score) === 'bad') row.bad += 1;

    ratingByAgent.set(rating.assignee_id, row);
  }

  return agents
    .filter((a) => a.active !== false)
    .map((agent) => {
      const assignedTickets = tickets.filter(
        (t) => t.assignee_id === agent.id,
      );

      const feedback = ratingByAgent.get(agent.id) || {
        good: 0,
        bad: 0,
      };

      return {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        assigned: assignedTickets.length,
        open: assignedTickets.filter((t) =>
          ['new', 'open'].includes(
            String(t.status || '').toLowerCase(),
          ),
        ).length,
        pending: assignedTickets.filter(
          (t) =>
            String(t.status || '').toLowerCase() ===
            'pending',
        ).length,
        high: assignedTickets.filter((t) =>
          ['high', 'urgent'].includes(
            String(t.priority || '').toLowerCase(),
          ),
        ).length,
        unassigned: 0,
        good: feedback.good,
        bad: feedback.bad,
        feedbackTotal: feedback.good + feedback.bad,
      };
    })
    .sort(
      (a, b) =>
        b.assigned - a.assigned ||
        b.high - a.high ||
        a.name.localeCompare(b.name),
    );
}

export function badFeedbackBreakdowns(
  ratings: ZendeskSatisfactionRating[],
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const map = ticketMap(tickets);

  const rows = ratings
    .filter((r) => score(r.score) === 'bad')
    .map((rating) => {
      const ticket = rating.ticket_id
        ? map.get(rating.ticket_id)
        : undefined;

      const dims = ticket
        ? dimensionsForTicket(ticket, fields, forms)
        : {
            region: 'Other',
            device: 'Unknown device',
            issue: 'Uncategorized',
            form: 'No form',
          };

      return { rating, ticket, dims };
    });

  function countBy(
    selector: (row: (typeof rows)[number]) => string,
  ) {
    const out = new Map<string, number>();

    for (const row of rows) {
      const label = selector(row) || 'Unknown';
      out.set(label, (out.get(label) || 0) + 1);
    }

    return [...out.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  return {
    rows,
    devices: countBy((row) => row.dims.device),
    regions: countBy((row) => row.dims.region),
    forms: countBy((row) => row.dims.form),
    issues: countBy((row) => row.dims.issue),
  };
}
