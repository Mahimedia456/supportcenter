import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import {
  allProductOptions,
  dimensionsForTicket,
} from '@/lib/zendesk-dimensions';

export type DeviceHealthRow = {
  device: string;
  total: number;
  open: number;
  high: number;
  unassigned: number;
  rma: number;
  faulty: number;
  last7Days: number;
  previous7Days: number;
  trendPct: number | null;
};

function lower(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isOpen(
  ticket: ZendeskTicket,
) {
  return [
    'new',
    'open',
    'pending',
  ].includes(lower(ticket.status));
}

function isHigh(
  ticket: ZendeskTicket,
) {
  return [
    'high',
    'urgent',
  ].includes(lower(ticket.priority));
}

function text(
  ticket: ZendeskTicket,
) {
  return [
    ticket.subject || '',
    ticket.description || '',
    ...(ticket.tags || []),
  ]
    .join(' ')
    .toLowerCase();
}

export function isRmaTicket(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const dim =
    dimensionsForTicket(
      ticket,
      fields,
      forms,
    );

  const haystack = [
    dim.form,
    dim.issue,
    text(ticket),
  ]
    .join(' ')
    .toLowerCase();

  return [
    'rma',
    'return merchandise',
    'return authorization',
    'replacement',
  ].some((value) =>
    haystack.includes(value),
  );
}

export function isFaultyTicket(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const dim =
    dimensionsForTicket(
      ticket,
      fields,
      forms,
    );

  const haystack = [
    dim.issue,
    text(ticket),
  ]
    .join(' ')
    .toLowerCase();

  return [
    'fault',
    'faulty',
    'failure',
    'failed',
    'dead',
    'no power',
    'not powering',
    'broken',
    'defective',
    'not working',
    'does not work',
    'screen issue',
    'display issue',
    'recording issue',
    'hdmi issue',
  ].some((value) =>
    haystack.includes(value),
  );
}

function createdMs(
  ticket: ZendeskTicket,
) {
  const value = new Date(
    ticket.created_at ||
      ticket.updated_at ||
      0,
  ).getTime();

  return Number.isFinite(value)
    ? value
    : 0;
}

export function buildDeviceHealth(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const now = Date.now();
  const sevenDays =
    7 * 24 * 60 * 60 * 1000;

  const map = new Map<
    string,
    DeviceHealthRow
  >();

  // Seed from actual Zendesk dropdown
  // options so Atomos products still
  // appear even when a product has zero
  // tickets in the selected period.
  for (const product of
    allProductOptions(fields)) {
    map.set(product.toLowerCase(), {
      device: product,
      total: 0,
      open: 0,
      high: 0,
      unassigned: 0,
      rma: 0,
      faulty: 0,
      last7Days: 0,
      previous7Days: 0,
      trendPct: null,
    });
  }

  for (const ticket of tickets) {
    const dim =
      dimensionsForTicket(
        ticket,
        fields,
        forms,
      );

    const device = dim.device;

    if (
      !device ||
      device.toLowerCase() ===
        'unknown product'
    ) {
      continue;
    }

    const key =
      device.toLowerCase();

    const row =
      map.get(key) || {
        device,
        total: 0,
        open: 0,
        high: 0,
        unassigned: 0,
        rma: 0,
        faulty: 0,
        last7Days: 0,
        previous7Days: 0,
        trendPct: null,
      };

    row.total += 1;
    row.open +=
      isOpen(ticket) ? 1 : 0;
    row.high +=
      isHigh(ticket) ? 1 : 0;
    row.unassigned +=
      ticket.assignee_id ? 0 : 1;
    row.rma +=
      isRmaTicket(
        ticket,
        fields,
        forms,
      )
        ? 1
        : 0;
    row.faulty +=
      isFaultyTicket(
        ticket,
        fields,
        forms,
      )
        ? 1
        : 0;

    const age =
      now - createdMs(ticket);

    if (
      age >= 0 &&
      age < sevenDays
    ) {
      row.last7Days += 1;
    } else if (
      age >= sevenDays &&
      age < sevenDays * 2
    ) {
      row.previous7Days += 1;
    }

    map.set(key, row);
  }

  return [...map.values()]
    .map((row) => ({
      ...row,
      trendPct:
        row.previous7Days === 0
          ? row.last7Days > 0
            ? 100
            : null
          : Math.round(
              ((row.last7Days -
                row.previous7Days) /
                row.previous7Days) *
                100,
            ),
    }))
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.device.localeCompare(
          b.device,
        ),
    );
}

export function deviceTickets(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
) {
  return tickets.filter(
    (ticket) =>
      dimensionsForTicket(
        ticket,
        fields,
        forms,
      ).device.toLowerCase() ===
      device.toLowerCase(),
  );
}

export function topIssuesForDevice(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
) {
  const map =
    new Map<string, number>();

  for (const ticket of
    deviceTickets(
      tickets,
      fields,
      forms,
      device,
    )) {
    const issue =
      dimensionsForTicket(
        ticket,
        fields,
        forms,
      ).issue;

    map.set(
      issue,
      (map.get(issue) || 0) + 1,
    );
  }

  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) => b.count - a.count,
    );
}

export function regionsForDevice(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
) {
  const map =
    new Map<string, number>();

  for (const ticket of
    deviceTickets(
      tickets,
      fields,
      forms,
      device,
    )) {
    const region =
      dimensionsForTicket(
        ticket,
        fields,
        forms,
      ).region;

    map.set(
      region,
      (map.get(region) || 0) + 1,
    );
  }

  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) => b.count - a.count,
    );
}
