import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';
import { dimensionValue } from '@/lib/support-dimensions';

export type RmaDisposition = 'repair' | 'replacement' | 'unknown';
export type RmaShipmentState =
  | 'pending_ship'
  | 'shipped'
  | 'returned'
  | 'unknown';

export type RmaTicketInfo = {
  isRma: boolean;
  device: string;
  category: string;
  disposition: RmaDisposition;
  shipment: RmaShipmentState;
  shippedDate: string;
  returnedDate: string;
  detectedBy: string[];
};

export type RmaDeviceRow = {
  device: string;
  total: number;
  pendingShip: number;
  shipped: number;
  returned: number;
  repair: number;
  replacement: number;
  unknownDisposition: number;
};

function norm(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function fieldTitle(field: ZendeskTicketField) {
  const item: any = field;
  return String(item.title || item.raw_title || item.description || '').trim();
}

function optionLabel(field: ZendeskTicketField, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';
  if (Array.isArray(raw)) {
    return raw.map((value) => optionLabel(field, value)).filter(Boolean).join(', ');
  }

  const text = String(raw);
  const item: any = field;
  const options: any[] = item.custom_field_options || item.system_field_options || [];
  const match = options.find(
    (option) => String(option.value) === text || String(option.id) === text,
  );

  return String(match?.name || match?.raw_name || text).trim();
}

function ticketFieldRows(ticket: ZendeskTicket, fields: ZendeskTicketField[]) {
  const byId = new Map(fields.map((field) => [Number(field.id), field]));
  const custom: any[] = (ticket as any).custom_fields || [];

  return custom
    .map((item) => {
      const field = byId.get(Number(item.id));
      if (!field) return null;
      const title = fieldTitle(field);
      const value = optionLabel(field, item.value);
      if (!value) return null;
      return { field, title, value, titleNorm: norm(title), valueNorm: norm(value) };
    })
    .filter(Boolean) as Array<{
      field: ZendeskTicketField;
      title: string;
      value: string;
      titleNorm: string;
      valueNorm: string;
    }>;
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function formLabel(ticket: ZendeskTicket, forms: ZendeskForm[]) {
  const form = forms.find((item) => Number(item.id) === Number(ticket.ticket_form_id));
  return String(form?.display_name || form?.name || '').trim();
}

function explicitRmaCategory(rows: ReturnType<typeof ticketFieldRows>) {
  const preferred = rows.find((row) =>
    includesAny(row.titleNorm, [
      'rma type',
      'rma category',
      'return type',
      'return category',
      'repair type',
      'repair category',
    ]),
  );

  return preferred?.value || '';
}

function detectDisposition(
  rows: ReturnType<typeof ticketFieldRows>,
  category: string,
  ticket: ZendeskTicket,
): RmaDisposition {
  const candidateRows = rows.filter((row) =>
    includesAny(row.titleNorm, [
      'rma',
      'repair',
      'replacement',
      'replace',
      'resolution',
      'outcome',
      'disposition',
      'action taken',
      'solution',
    ]),
  );

  const combined = norm(
    [category, ...candidateRows.map((row) => row.value)].join(' '),
  );

  if (
    includesAny(combined, [
      'replacement',
      'replaced',
      'replace unit',
      'unit replaced',
      'swap',
      'exchanged',
      'exchange unit',
    ])
  ) {
    return 'replacement';
  }

  if (
    includesAny(combined, [
      'repair',
      'repaired',
      'repair unit',
      'unit repaired',
      'service repair',
    ])
  ) {
    return 'repair';
  }

  const tags = (ticket.tags || []).map(norm).join(' ');
  if (includesAny(tags, ['replacement', 'replaced', 'unit replaced'])) {
    return 'replacement';
  }
  if (includesAny(tags, ['repair', 'repaired'])) {
    return 'repair';
  }

  return 'unknown';
}

function dateFromRows(
  rows: ReturnType<typeof ticketFieldRows>,
  titleTerms: string[],
) {
  const row = rows.find((item) => includesAny(item.titleNorm, titleTerms));
  return row?.value || '';
}

function detectShipment(
  rows: ReturnType<typeof ticketFieldRows>,
  shippedDate: string,
  returnedDate: string,
): RmaShipmentState {
  if (returnedDate) return 'returned';

  const shippingRows = rows.filter((row) =>
    includesAny(row.titleNorm, [
      'ship',
      'shipping',
      'shipment',
      'dispatch',
      'return status',
      'rma status',
      'repair status',
      'return stage',
    ]),
  );

  const combined = norm(shippingRows.map((row) => row.value).join(' '));

  if (
    includesAny(combined, [
      'returned',
      'received back',
      'received at',
      'return complete',
      'delivered back',
    ])
  ) {
    return 'returned';
  }

  if (
    shippedDate ||
    includesAny(combined, [
      'shipped',
      'dispatched',
      'in transit',
      'sent',
      'shipment complete',
    ])
  ) {
    return 'shipped';
  }

  if (
    includesAny(combined, [
      'pending ship',
      'pending shipment',
      'awaiting shipment',
      'awaiting shipping',
      'ready to ship',
      'to be shipped',
      'not shipped',
      'pending dispatch',
      'awaiting dispatch',
    ])
  ) {
    return 'pending_ship';
  }

  return 'unknown';
}

export function rmaTicketInfo(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
): RmaTicketInfo {
  const rows = ticketFieldRows(ticket, fields);
  const form = formLabel(ticket, forms);
  const formNorm = norm(form);
  const detectedBy: string[] = [];

  const rmaDimension = dimensionValue(ticket, fields, 'rma');
  if (rmaDimension) detectedBy.push('RMA field');

  const rmaRelevantRows = rows.filter((row) =>
    includesAny(row.titleNorm, [
      'rma',
      'return merchandise',
      'return authorization',
      'repair request',
      'repair type',
      'repair status',
      'replacement',
      'date returned',
      'return date',
      'date shipped',
      'shipped date',
    ]),
  );

  if (rmaRelevantRows.length) detectedBy.push('RMA custom fields');

  const repairForm = includesAny(formNorm, [
    'request a repair',
    'request repair',
    'repair request',
    'rma',
    'return merchandise',
  ]);
  if (repairForm) detectedBy.push(`Form: ${form}`);

  const tags = (ticket.tags || []).map(norm);
  const rmaTag = tags.some((tag) =>
    includesAny(tag, ['rma', 'repair request', 'return merchandise']),
  );
  if (rmaTag) detectedBy.push('RMA tag');

  const isRma = Boolean(
    rmaDimension || rmaRelevantRows.length || repairForm || rmaTag,
  );

  const category =
    rmaDimension || explicitRmaCategory(rows) || (repairForm ? form : '') || 'Uncategorized RMA';

  const device = dimensionValue(ticket, fields, 'device') || 'Unknown device';

  const shippedDate = dateFromRows(rows, [
    'date shipped',
    'shipped date',
    'shipment date',
    'dispatch date',
  ]);

  const returnedDate = dateFromRows(rows, [
    'date returned',
    'returned date',
    'return date',
    'date received',
    'received date',
  ]);

  const disposition = detectDisposition(rows, category, ticket);
  const shipment = detectShipment(rows, shippedDate, returnedDate);

  return {
    isRma,
    device,
    category,
    disposition,
    shipment,
    shippedDate,
    returnedDate,
    detectedBy,
  };
}

export function rmaTickets(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  return tickets.filter((ticket) => rmaTicketInfo(ticket, fields, forms).isRma);
}

export function rmaDeviceRows(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
): RmaDeviceRow[] {
  const map = new Map<string, RmaDeviceRow>();

  for (const ticket of tickets) {
    const info = rmaTicketInfo(ticket, fields, forms);
    if (!info.isRma) continue;

    const row = map.get(info.device) || {
      device: info.device,
      total: 0,
      pendingShip: 0,
      shipped: 0,
      returned: 0,
      repair: 0,
      replacement: 0,
      unknownDisposition: 0,
    };

    row.total += 1;
    if (info.shipment === 'pending_ship') row.pendingShip += 1;
    if (info.shipment === 'shipped') row.shipped += 1;
    if (info.shipment === 'returned') row.returned += 1;
    if (info.disposition === 'repair') row.repair += 1;
    if (info.disposition === 'replacement') row.replacement += 1;
    if (info.disposition === 'unknown') row.unknownDisposition += 1;

    map.set(info.device, row);
  }

  return [...map.values()].sort((a, b) => b.total - a.total || a.device.localeCompare(b.device));
}

export function rmaCategoryRows(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const map = new Map<string, number>();

  for (const ticket of tickets) {
    const info = rmaTicketInfo(ticket, fields, forms);
    if (!info.isRma) continue;
    map.set(info.category, (map.get(info.category) || 0) + 1);
  }

  return [...map.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

export function shipmentLabel(value: RmaShipmentState) {
  switch (value) {
    case 'pending_ship':
      return 'Pending ship';
    case 'shipped':
      return 'Shipped';
    case 'returned':
      return 'Returned';
    default:
      return 'Not classified';
  }
}

export function dispositionLabel(value: RmaDisposition) {
  switch (value) {
    case 'repair':
      return 'Repair';
    case 'replacement':
      return 'Replaced';
    default:
      return 'Not classified';
  }
}
