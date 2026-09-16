
import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import {
  dimensionsForTicket,
  type AtomosFieldRole,
} from '@/lib/zendesk-dimensions';

export type TicketResultMode =
  | 'all'
  | 'form'
  | 'atomos-field'
  | 'ids';

export function drilldownTickets({
  tickets,
  fields,
  forms,
  mode,
  role,
  value,
  formId,
  ids,
}: {
  tickets: ZendeskTicket[];
  fields: ZendeskTicketField[];
  forms: ZendeskForm[];
  mode: TicketResultMode;
  role?: AtomosFieldRole;
  value?: string;
  formId?: number;
  ids?: number[];
}) {
  if (mode === 'ids') {
    const wanted =
      new Set(ids || []);

    return tickets.filter(
      (ticket) =>
        wanted.has(ticket.id),
    );
  }

  if (
    mode === 'form' &&
    formId
  ) {
    return tickets.filter(
      (ticket) =>
        ticket.ticket_form_id ===
        formId,
    );
  }

  if (
    mode === 'atomos-field' &&
    role &&
    value
  ) {
    const wanted =
      value.toLowerCase();

    return tickets.filter(
      (ticket) => {
        const d =
          dimensionsForTicket(
            ticket,
            fields,
            forms,
          );

        const current =
          role === 'device'
            ? d.device
            : role ===
                'supportType'
              ? d.supportType
              : role ===
                  'region'
                ? d.region
                : role ===
                    'category'
                  ? d.category
                  : role ===
                      'faultCategory'
                    ? d.faultCategory
                    : d.rma;

        return current
          .split(',')
          .map((item) =>
            item
              .trim()
              .toLowerCase(),
          )
          .includes(wanted);
      },
    );
  }

  return tickets;
}

export function applyTicketUiFilters(
  tickets: ZendeskTicket[],
  {
    query,
    status,
    priority,
    assignment,
    sort,
  }: {
    query: string;
    status: string;
    priority: string;
    assignment: string;
    sort: string;
  },
) {
  const needle =
    query.trim().toLowerCase();

  const filtered =
    tickets.filter((ticket) => {
      if (
        needle &&
        ![
          ticket.id,
          ticket.subject || '',
          ticket.description || '',
          ...(ticket.tags || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }

      if (
        status !== 'all' &&
        String(
          ticket.status || '',
        ).toLowerCase() !== status
      ) {
        return false;
      }

      if (
        priority !== 'all' &&
        String(
          ticket.priority || 'none',
        ).toLowerCase() !==
          priority
      ) {
        return false;
      }

      if (
        assignment ===
          'unassigned' &&
        ticket.assignee_id
      ) {
        return false;
      }

      if (
        assignment ===
          'assigned' &&
        !ticket.assignee_id
      ) {
        return false;
      }

      return true;
    });

  return [...filtered].sort(
    (a, b) => {
      const aTime =
        new Date(
          a.created_at ||
            a.updated_at ||
            0,
        ).getTime();

      const bTime =
        new Date(
          b.created_at ||
            b.updated_at ||
            0,
        ).getTime();

      if (sort === 'oldest') {
        return aTime - bTime;
      }

      return bTime - aTime;
    },
  );
}
