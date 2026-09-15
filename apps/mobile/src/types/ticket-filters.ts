import type { ZendeskTicket } from '@/lib/api';

export type ManagerViewKey =
  | 'attention'
  | 'open'
  | 'pending'
  | 'unassigned'
  | 'priority'
  | 'recent';

export type TicketSortKey =
  | 'updated_desc'
  | 'updated_asc'
  | 'created_desc'
  | 'created_asc'
  | 'priority';

export const MANAGER_VIEWS: Array<{
  key: ManagerViewKey;
  title: string;
  caption: string;
}> = [
  {
    key: 'attention',
    title: 'Needs Attention',
    caption: 'Unassigned, urgent/high or active tickets',
  },
  {
    key: 'open',
    title: 'Open',
    caption: 'New and open tickets',
  },
  {
    key: 'pending',
    title: 'Pending',
    caption: 'Tickets currently pending',
  },
  {
    key: 'unassigned',
    title: 'Unassigned',
    caption: 'No assignee on the ticket',
  },
  {
    key: 'priority',
    title: 'High Priority',
    caption: 'High and urgent tickets',
  },
  {
    key: 'recent',
    title: 'Recently Updated',
    caption: 'Latest activity first',
  },
];

function dateValue(value?: string | null) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function priorityRank(value?: string | null) {
  switch (String(value || '').toLowerCase()) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'normal':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

export function applyManagerView(
  tickets: ZendeskTicket[],
  key: ManagerViewKey,
) {
  const now = Date.now();

  switch (key) {
    case 'open':
      return tickets.filter((ticket) =>
        ['new', 'open'].includes(String(ticket.status || '').toLowerCase()),
      );

    case 'pending':
      return tickets.filter(
        (ticket) => String(ticket.status || '').toLowerCase() === 'pending',
      );

    case 'unassigned':
      return tickets.filter((ticket) => !ticket.assignee_id);

    case 'priority':
      return tickets.filter((ticket) =>
        ['high', 'urgent'].includes(
          String(ticket.priority || '').toLowerCase(),
        ),
      );

    case 'recent':
      return [...tickets]
        .sort(
          (a, b) =>
            dateValue(b.updated_at) - dateValue(a.updated_at),
        )
        .slice(0, 100);

    case 'attention':
    default:
      return tickets.filter((ticket) => {
        const status = String(ticket.status || '').toLowerCase();
        const priority = String(ticket.priority || '').toLowerCase();
        const active = ['new', 'open', 'pending'].includes(status);
        const important = ['high', 'urgent'].includes(priority);
        const unassigned = !ticket.assignee_id;
        const updatedRecently =
          now - dateValue(ticket.updated_at) < 1000 * 60 * 60 * 24 * 7;

        return active && updatedRecently && (important || unassigned);
      });
  }
}

export function ticketMatchesSearch(
  ticket: ZendeskTicket,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return [
    String(ticket.id),
    ticket.subject || '',
    ticket.description || '',
    ticket.status || '',
    ticket.priority || '',
    ticket.type || '',
    ...(ticket.tags || []),
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function sortTickets(
  tickets: ZendeskTicket[],
  sort: TicketSortKey,
) {
  const result = [...tickets];

  switch (sort) {
    case 'updated_asc':
      return result.sort(
        (a, b) => dateValue(a.updated_at) - dateValue(b.updated_at),
      );

    case 'created_desc':
      return result.sort(
        (a, b) => dateValue(b.created_at) - dateValue(a.created_at),
      );

    case 'created_asc':
      return result.sort(
        (a, b) => dateValue(a.created_at) - dateValue(b.created_at),
      );

    case 'priority':
      return result.sort(
        (a, b) =>
          priorityRank(b.priority) - priorityRank(a.priority) ||
          dateValue(b.updated_at) - dateValue(a.updated_at),
      );

    case 'updated_desc':
    default:
      return result.sort(
        (a, b) => dateValue(b.updated_at) - dateValue(a.updated_at),
      );
  }
}
