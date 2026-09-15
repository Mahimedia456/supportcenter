import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import { dimensionsForTicket } from '@/lib/zendesk-dimensions';

export type BreakdownRow = {
  key: string;
  label: string;
  count: number;
  open: number;
  high: number;
  unassigned: number;
};

function isOpen(ticket: ZendeskTicket) {
  return ['new', 'open'].includes(
    String(ticket.status || '').toLowerCase(),
  );
}

function isHigh(ticket: ZendeskTicket) {
  return ['high', 'urgent'].includes(
    String(ticket.priority || '').toLowerCase(),
  );
}

export function buildBreakdown(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  dimension: 'form' | 'region' | 'device' | 'issue',
): BreakdownRow[] {
  const map = new Map<string, BreakdownRow>();

  for (const ticket of tickets) {
    const dimensions = dimensionsForTicket(
      ticket,
      fields,
      forms,
    );

    const label = dimensions[dimension] || 'Unknown';
    const key = label.toLowerCase();

    const row =
      map.get(key) ||
      {
        key,
        label,
        count: 0,
        open: 0,
        high: 0,
        unassigned: 0,
      };

    row.count += 1;
    row.open += isOpen(ticket) ? 1 : 0;
    row.high += isHigh(ticket) ? 1 : 0;
    row.unassigned += ticket.assignee_id ? 0 : 1;

    map.set(key, row);
  }

  return [...map.values()].sort(
    (a, b) => b.count - a.count,
  );
}

export function ticketsForDimension(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  dimension: 'form' | 'region' | 'device' | 'issue',
  label: string,
) {
  return tickets.filter((ticket) => {
    const dimensions = dimensionsForTicket(
      ticket,
      fields,
      forms,
    );

    return (
      dimensions[dimension].toLowerCase() ===
      label.toLowerCase()
    );
  });
}
