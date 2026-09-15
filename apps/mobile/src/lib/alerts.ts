import type {
  ZendeskForm,
  ZendeskMetricEvent,
  ZendeskSatisfactionRating,
  ZendeskTicket,
  ZendeskTicketField,
  ZendeskTicketMetric,
} from '@/lib/api';
import {
  buildDeviceHealth,
} from '@/lib/device-health';

export type ManagerAlertKind =
  | 'sla_breach'
  | 'no_first_reply'
  | 'slow_first_reply'
  | 'unsolved_72h'
  | 'unsolved_24h'
  | 'stale'
  | 'reopened'
  | 'priority'
  | 'unassigned'
  | 'bad_csat'
  | 'device_spike';

export type ManagerAlert = {
  id: string;
  kind: ManagerAlertKind;
  severity:
    | 'critical'
    | 'warning'
    | 'info';
  title: string;
  message: string;
  count: number;
  ticketIds: number[];
  entityLabel?: string;
};

const HOUR =
  60 * 60 * 1000;

function ageHours(
  value?: string | null,
) {
  const ms = new Date(
    value || 0,
  ).getTime();

  if (!Number.isFinite(ms)) {
    return 0;
  }

  return (
    (Date.now() - ms) /
    HOUR
  );
}

function active(
  ticket: ZendeskTicket,
) {
  return [
    'new',
    'open',
    'pending',
    'hold',
  ].includes(
    String(
      ticket.status || '',
    ).toLowerCase(),
  );
}

export function buildManagerAlerts(
  tickets: ZendeskTicket[],
  ratings:
    ZendeskSatisfactionRating[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  metrics:
    ZendeskTicketMetric[] = [],
  metricEvents:
    ZendeskMetricEvent[] = [],
): ManagerAlert[] {
  const alerts: ManagerAlert[] = [];

  const byMetric = new Map(
    metrics.map((item) => [
      item.ticket_id,
      item,
    ]),
  );

  const ticketMap = new Map(
    tickets.map((ticket) => [
      ticket.id,
      ticket,
    ]),
  );

  const breachIds = [
    ...new Set(
      metricEvents
        .filter(
          (event) =>
            event.type ===
              'breach' &&
            event.ticket_id,
        )
        .map(
          (event) =>
            event.ticket_id,
        ),
    ),
  ];

  if (breachIds.length) {
    alerts.push({
      id: 'sla-breach',
      kind: 'sla_breach',
      severity: 'critical',
      title: 'Zendesk SLA breached',
      message: `${breachIds.length} ticket${
        breachIds.length === 1
          ? ''
          : 's'
      } have an actual Zendesk SLA breach event.`,
      count: breachIds.length,
      ticketIds: breachIds,
    });
  }

  const noReply = tickets.filter(
    (ticket) => {
      if (!active(ticket)) {
        return false;
      }

      const metric =
        byMetric.get(ticket.id);

      return (
        metric &&
        (metric.replies || 0) === 0 &&
        ageHours(
          ticket.created_at,
        ) >= 2
      );
    },
  );

  if (noReply.length) {
    alerts.push({
      id: 'no-first-reply-2h',
      kind: 'no_first_reply',
      severity: 'critical',
      title: 'No first reply > 2 hours',
      message: `${noReply.length} active ticket${
        noReply.length === 1
          ? ''
          : 's'
      } have no public agent reply after 2 hours.`,
      count: noReply.length,
      ticketIds: noReply.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const slowReplyIds =
    metrics
      .filter(
        (metric) =>
          Number(
            metric
              .reply_time_in_minutes
              ?.calendar || 0,
          ) > 120,
      )
      .map(
        (metric) =>
          metric.ticket_id,
      )
      .filter((id) =>
        ticketMap.has(id),
      );

  if (slowReplyIds.length) {
    alerts.push({
      id: 'slow-first-reply',
      kind: 'slow_first_reply',
      severity: 'warning',
      title: 'First reply exceeded 2 hours',
      message: `${slowReplyIds.length} ticket${
        slowReplyIds.length === 1
          ? ''
          : 's'
      } had a first reply time above 120 minutes.`,
      count: slowReplyIds.length,
      ticketIds: slowReplyIds,
    });
  }

  const unsolved72 =
    tickets.filter(
      (ticket) =>
        active(ticket) &&
        ageHours(
          ticket.created_at,
        ) >= 72,
    );

  if (unsolved72.length) {
    alerts.push({
      id: 'unsolved-72h',
      kind: 'unsolved_72h',
      severity: 'critical',
      title: 'Unsolved > 72 hours',
      message: `${unsolved72.length} active ticket${
        unsolved72.length === 1
          ? ''
          : 's'
      } have remained unsolved for 72+ hours.`,
      count: unsolved72.length,
      ticketIds: unsolved72.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const unsolved24 =
    tickets.filter((ticket) => {
      const age =
        ageHours(
          ticket.created_at,
        );

      return (
        active(ticket) &&
        age >= 24 &&
        age < 72
      );
    });

  if (unsolved24.length) {
    alerts.push({
      id: 'unsolved-24h',
      kind: 'unsolved_24h',
      severity: 'warning',
      title: 'Unsolved > 24 hours',
      message: `${unsolved24.length} active ticket${
        unsolved24.length === 1
          ? ''
          : 's'
      } have remained unsolved for 24+ hours.`,
      count: unsolved24.length,
      ticketIds: unsolved24.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const stale = tickets.filter(
    (ticket) =>
      active(ticket) &&
      ageHours(
        ticket.updated_at ||
          ticket.created_at,
      ) >= 24,
  );

  if (stale.length) {
    alerts.push({
      id: 'stale-24h',
      kind: 'stale',
      severity: 'warning',
      title: 'No ticket activity > 24 hours',
      message: `${stale.length} active ticket${
        stale.length === 1
          ? ''
          : 's'
      } have had no update for 24+ hours.`,
      count: stale.length,
      ticketIds: stale.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const reopenedIds =
    metrics
      .filter(
        (metric) =>
          Number(
            metric.reopens || 0,
          ) > 0,
      )
      .map(
        (metric) =>
          metric.ticket_id,
      )
      .filter((id) =>
        ticketMap.has(id),
      );

  if (reopenedIds.length) {
    alerts.push({
      id: 'reopened',
      kind: 'reopened',
      severity: 'warning',
      title: 'Reopened tickets',
      message: `${reopenedIds.length} ticket${
        reopenedIds.length === 1
          ? ''
          : 's'
      } were reopened at least once.`,
      count: reopenedIds.length,
      ticketIds: reopenedIds,
    });
  }

  const priority =
    tickets.filter((ticket) =>
      [
        'high',
        'urgent',
      ].includes(
        String(
          ticket.priority || '',
        ).toLowerCase(),
      ),
    );

  if (priority.length) {
    alerts.push({
      id: 'priority',
      kind: 'priority',
      severity: 'warning',
      title: 'High priority queue',
      message: `${priority.length} high/urgent ticket${
        priority.length === 1
          ? ''
          : 's'
      } need manager visibility.`,
      count: priority.length,
      ticketIds: priority.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const unassigned =
    tickets.filter(
      (ticket) =>
        active(ticket) &&
        !ticket.assignee_id,
    );

  if (unassigned.length) {
    alerts.push({
      id: 'unassigned',
      kind: 'unassigned',
      severity: 'warning',
      title: 'Active unassigned tickets',
      message: `${unassigned.length} active ticket${
        unassigned.length === 1
          ? ''
          : 's'
      } do not have an assignee.`,
      count: unassigned.length,
      ticketIds: unassigned.map(
        (ticket) => ticket.id,
      ),
    });
  }

  const badRatings =
    ratings.filter(
      (rating) =>
        String(
          rating.score || '',
        ).toLowerCase() ===
        'bad',
    );

  if (badRatings.length) {
    alerts.push({
      id: 'bad-csat',
      kind: 'bad_csat',
      severity: 'critical',
      title: 'Bad customer feedback',
      message: `${badRatings.length} bad CSAT rating${
        badRatings.length === 1
          ? ''
          : 's'
      } were recorded in the selected period.`,
      count: badRatings.length,
      ticketIds: badRatings
        .map((rating) =>
          Number(
            rating.ticket_id,
          ),
        )
        .filter(Number.isFinite),
    });
  }

  const devices =
    buildDeviceHealth(
      tickets,
      fields,
      forms,
    )
      .filter(
        (row) =>
          row.last7Days >= 3 &&
          (row.trendPct || 0) >=
            50,
      )
      .slice(0, 5);

  for (const row of devices) {
    const ids = tickets
      .filter((ticket) => {
        // lazy device matching through
        // device-health isn't exported
        // here; use product text as a
        // fallback for aggregate alert.
        return [
          ticket.subject || '',
          ticket.description || '',
          ...(ticket.tags || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(
            row.device.toLowerCase(),
          );
      })
      .map(
        (ticket) => ticket.id,
      );

    alerts.push({
      id: `device-spike:${encodeURIComponent(
        row.device,
      )}`,
      kind: 'device_spike',
      severity: 'info',
      title: 'Product support spike',
      message: `${row.device} has ${row.last7Days} cases in the last 7 days (${row.trendPct}% vs previous 7 days).`,
      count: row.last7Days,
      ticketIds: ids,
      entityLabel: row.device,
    });
  }

  return alerts.sort((a, b) => {
    const order = {
      critical: 0,
      warning: 1,
      info: 2,
    };

    return (
      order[a.severity] -
      order[b.severity]
    );
  });
}

export function ticketsForAlert(
  alert: ManagerAlert,
  tickets: ZendeskTicket[],
) {
  const ids =
    new Set(alert.ticketIds);

  return tickets.filter(
    (ticket) =>
      ids.has(ticket.id),
  );
}
