import type {
  ZendeskForm,
  ZendeskSatisfactionRating,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import {
  buildDeviceHealth,
} from '@/lib/device-health';
import {
  buildBreakdown,
} from '@/lib/insight-analytics';

export type ManagerAlertKind =
  | 'priority'
  | 'unassigned'
  | 'stale'
  | 'bad_csat'
  | 'device_spike'
  | 'region_spike'
  | 'form_spike';

export type ManagerAlert = {
  id: string;
  kind: ManagerAlertKind;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  count: number;
  ticketIds: number[];
  entityLabel?: string;
};

function updatedMs(ticket: ZendeskTicket) {
  const value = new Date(ticket.updated_at || ticket.created_at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function isActive(ticket: ZendeskTicket) {
  return ['new', 'open', 'pending'].includes(
    String(ticket.status || '').toLowerCase(),
  );
}

export function buildManagerAlerts(
  tickets: ZendeskTicket[],
  ratings: ZendeskSatisfactionRating[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
): ManagerAlert[] {
  const alerts: ManagerAlert[] = [];

  const priorityTickets = tickets.filter((ticket) =>
    ['urgent', 'high'].includes(
      String(ticket.priority || '').toLowerCase(),
    ),
  );

  if (priorityTickets.length) {
    alerts.push({
      id: 'priority',
      kind: 'priority',
      severity: 'critical',
      title: 'High priority queue',
      message: `${priorityTickets.length} high/urgent ticket${priorityTickets.length === 1 ? '' : 's'} need manager visibility.`,
      count: priorityTickets.length,
      ticketIds: priorityTickets.map((t) => t.id),
    });
  }

  const unassigned = tickets.filter(
    (ticket) => isActive(ticket) && !ticket.assignee_id,
  );

  if (unassigned.length) {
    alerts.push({
      id: 'unassigned',
      kind: 'unassigned',
      severity: 'warning',
      title: 'Unassigned active tickets',
      message: `${unassigned.length} active ticket${unassigned.length === 1 ? '' : 's'} currently have no assignee.`,
      count: unassigned.length,
      ticketIds: unassigned.map((t) => t.id),
    });
  }

  const staleLimit = Date.now() - 24 * 60 * 60 * 1000;
  const stale = tickets.filter(
    (ticket) =>
      isActive(ticket) &&
      updatedMs(ticket) > 0 &&
      updatedMs(ticket) < staleLimit,
  );

  if (stale.length) {
    alerts.push({
      id: 'stale',
      kind: 'stale',
      severity: 'warning',
      title: 'No recent activity',
      message: `${stale.length} active ticket${stale.length === 1 ? '' : 's'} have not changed for more than 24 hours.`,
      count: stale.length,
      ticketIds: stale.map((t) => t.id),
    });
  }

  const badRatings = ratings.filter(
    (rating) =>
      String(rating.score || '').toLowerCase() === 'bad',
  );

  if (badRatings.length) {
    alerts.push({
      id: 'bad-csat',
      kind: 'bad_csat',
      severity: 'critical',
      title: 'Bad customer feedback',
      message: `${badRatings.length} bad satisfaction rating${badRatings.length === 1 ? '' : 's'} in the current 30-day window.`,
      count: badRatings.length,
      ticketIds: badRatings
        .map((rating) => rating.ticket_id)
        .filter((id): id is number => Boolean(id)),
    });
  }

  const devices = buildDeviceHealth(tickets, fields, forms)
    .filter(
      (row) =>
        row.last7Days >= 3 &&
        row.trendPct !== null &&
        row.trendPct >= 50,
    )
    .slice(0, 5);

  for (const row of devices) {
    alerts.push({
      id: `device-${row.device}`,
      kind: 'device_spike',
      severity: row.trendPct && row.trendPct >= 100 ? 'critical' : 'warning',
      title: 'Device support spike',
      message: `${row.device} is up ${row.trendPct ?? 0}% vs the previous 7 days.`,
      count: row.last7Days,
      ticketIds: [],
      entityLabel: row.device,
    });
  }

  const regions = buildBreakdown(
    tickets,
    fields,
    forms,
    'region',
  )
    .filter((row) => row.count >= 10)
    .slice(0, 3);

  for (const row of regions) {
    alerts.push({
      id: `region-${row.label}`,
      kind: 'region_spike',
      severity: 'info',
      title: 'Region volume concentration',
      message: `${row.label} currently represents ${row.count} tickets in the 30-day window.`,
      count: row.count,
      ticketIds: [],
      entityLabel: row.label,
    });
  }

  const formsRows = buildBreakdown(
    tickets,
    fields,
    forms,
    'form',
  )
    .filter((row) => row.count >= 10)
    .slice(0, 3);

  for (const row of formsRows) {
    alerts.push({
      id: `form-${row.label}`,
      kind: 'form_spike',
      severity: 'info',
      title: 'Form volume concentration',
      message: `${row.label} currently has ${row.count} tickets in the 30-day window.`,
      count: row.count,
      ticketIds: [],
      entityLabel: row.label,
    });
  }

  const severityRank = {
    critical: 3,
    warning: 2,
    info: 1,
  };

  return alerts.sort(
    (a, b) =>
      severityRank[b.severity] - severityRank[a.severity] ||
      b.count - a.count,
  );
}

export function ticketsForAlert(
  alert: ManagerAlert,
  tickets: ZendeskTicket[],
  ratings: ZendeskSatisfactionRating[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  if (alert.ticketIds.length) {
    const ids = new Set(alert.ticketIds);
    return tickets.filter((ticket) => ids.has(ticket.id));
  }

  if (
    alert.kind === 'device_spike' &&
    alert.entityLabel
  ) {
    return tickets.filter((ticket) => {
      const row = buildDeviceHealth(
        [ticket],
        fields,
        forms,
      )[0];
      return (
        row?.device.toLowerCase() ===
        alert.entityLabel?.toLowerCase()
      );
    });
  }

  if (
    (alert.kind === 'region_spike' ||
      alert.kind === 'form_spike') &&
    alert.entityLabel
  ) {
    const dimension =
      alert.kind === 'region_spike' ? 'region' : 'form';

    const label = alert.entityLabel.toLowerCase();

    return tickets.filter((ticket) => {
      const rows = buildBreakdown(
        [ticket],
        fields,
        forms,
        dimension,
      );
      return rows.some(
        (row) => row.label.toLowerCase() === label,
      );
    });
  }

  return [];
}
