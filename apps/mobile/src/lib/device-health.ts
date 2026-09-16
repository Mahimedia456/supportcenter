import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import {
  dimensionsForTicket,
  roleOptions,
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

function active(ticket: ZendeskTicket) {
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

function high(ticket: ZendeskTicket) {
  return [
    'high',
    'urgent',
  ].includes(
    String(
      ticket.priority || '',
    ).toLowerCase(),
  );
}

function ageMs(ticket: ZendeskTicket) {
  const value = new Date(
    ticket.created_at ||
      ticket.updated_at ||
      0,
  ).getTime();

  return Number.isFinite(value)
    ? Date.now() - value
    : Number.POSITIVE_INFINITY;
}

function blank(device: string): DeviceHealthRow {
  return {
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
}

export function buildDeviceHealth(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const map =
    new Map<string, DeviceHealthRow>();

  // Seed actual Zendesk dropdown products.
  for (const name of roleOptions(
    fields,
    'device',
  )) {
    map.set(
      name.toLowerCase(),
      blank(name),
    );
  }

  const seven =
    7 * 24 * 60 * 60 * 1000;

  for (const ticket of tickets) {
    const dim =
      dimensionsForTicket(
        ticket,
        fields,
        forms,
      );

    if (
      !dim.device ||
      dim.device ===
        'Unknown device'
    ) {
      continue;
    }

    const devices = dim.device
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const device of devices) {
      const key =
        device.toLowerCase();

      const row =
        map.get(key) ||
        blank(device);

      row.total += 1;
      row.open += active(ticket)
        ? 1
        : 0;
      row.high += high(ticket)
        ? 1
        : 0;
      row.unassigned +=
        !ticket.assignee_id ? 1 : 0;

      const rmaText =
        dim.rma.toLowerCase();

      row.rma +=
        dim.rma !== 'No RMA' &&
        ![
          'no',
          'none',
          'false',
          'not required',
          'n/a',
        ].includes(rmaText)
          ? 1
          : 0;

      row.faulty +=
        dim.faultCategory !==
          'No fault category' &&
        ![
          'none',
          'no fault',
          'n/a',
        ].includes(
          dim.faultCategory.toLowerCase(),
        )
          ? 1
          : 0;

      const age = ageMs(ticket);

      if (age < seven) {
        row.last7Days += 1;
      } else if (
        age < seven * 2
      ) {
        row.previous7Days += 1;
      }

      map.set(key, row);
    }
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


export type DeviceBreakdownRow = {
  label: string;
  count: number;
};

export function deviceTickets(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
) {
  const wanted = device.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const value = dimensionsForTicket(
      ticket,
      fields,
      forms,
    ).device;

    return value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .includes(wanted);
  });
}

export function topIssuesForDevice(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
): DeviceBreakdownRow[] {
  const counts = new Map<string, number>();

  for (const ticket of deviceTickets(
    tickets,
    fields,
    forms,
    device,
  )) {
    const dimensions = dimensionsForTicket(
      ticket,
      fields,
      forms,
    );

    const label =
      dimensions.faultCategory !== 'No fault category'
        ? dimensions.faultCategory
        : dimensions.category !== 'Uncategorized'
          ? dimensions.category
          : dimensions.supportType !== 'Unspecified'
            ? dimensions.supportType
            : 'Uncategorized';

    counts.set(
      label,
      (counts.get(label) || 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.label.localeCompare(b.label),
    );
}

export function regionsForDevice(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
  device: string,
): DeviceBreakdownRow[] {
  const counts = new Map<string, number>();

  for (const ticket of deviceTickets(
    tickets,
    fields,
    forms,
    device,
  )) {
    const label = dimensionsForTicket(
      ticket,
      fields,
      forms,
    ).region || 'Other';

    counts.set(
      label,
      (counts.get(label) || 0) + 1,
    );
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.label.localeCompare(b.label),
    );
}
