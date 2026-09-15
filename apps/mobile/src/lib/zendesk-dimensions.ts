import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';

export type TicketDimensions = {
  region: string;
  device: string;
  issue: string;
  form: string;
};

type FieldRole = 'region' | 'device' | 'issue';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function roleScore(
  field: ZendeskTicketField,
  role: FieldRole,
) {
  const title = normalize(
    `${field.title} ${field.raw_title || ''} ${field.description || ''}`,
  );

  const needles: Record<FieldRole, string[]> = {
    region: [
      'region',
      'territory',
      'market',
      'geo',
      'country region',
      'sales region',
    ],
    device: [
      'device',
      'product',
      'model',
      'hardware',
      'unit',
      'product name',
    ],
    issue: [
      'issue',
      'fault',
      'problem',
      'symptom',
      'failure',
      'rma type',
      'case type',
      'issue category',
      'problem type',
    ],
  };

  return needles[role].reduce(
    (score, needle) =>
      score + (title.includes(needle) ? 1 : 0),
    0,
  );
}

export function detectField(
  fields: ZendeskTicketField[],
  role: FieldRole,
) {
  return [...fields]
    .filter((field) => field.active !== false)
    .map((field) => ({
      field,
      score: roleScore(field, role),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.field.position ?? 9999) -
          (b.field.position ?? 9999),
    )[0]?.field;
}

function fieldValue(
  ticket: ZendeskTicket,
  field?: ZendeskTicketField,
) {
  if (!field) return '';

  const raw = ticket.custom_fields?.find(
    (item) => item.id === field.id,
  )?.value;

  if (raw === null || raw === undefined || raw === '') {
    return '';
  }

  if (Array.isArray(raw)) {
    return raw.join(', ');
  }

  const rawText = String(raw);

  const option = field.custom_field_options?.find(
    (item) => item.value === rawText,
  );

  return (
    option?.name ||
    option?.raw_name ||
    rawText.replace(/_/g, ' ')
  );
}

export function normalizeRegion(value: string) {
  const raw = normalize(value);

  if (!raw) return 'Other';

  if (
    raw.includes('emea') ||
    raw.includes('middle east') ||
    raw.includes('africa') ||
    raw === 'me'
  ) {
    return 'EMEA';
  }

  if (
    raw.includes('europe') ||
    raw === 'eu' ||
    raw.includes('united kingdom') ||
    raw === 'uk'
  ) {
    return 'Europe';
  }

  if (
    raw === 'us' ||
    raw === 'usa' ||
    raw.includes('united states') ||
    raw.includes('north america')
  ) {
    return 'US';
  }

  if (
    raw.includes('apac') ||
    raw.includes('asia pacific') ||
    raw.includes('asia') ||
    raw.includes('australia')
  ) {
    return 'APAC';
  }

  return value.trim() || 'Other';
}

export function dimensionsForTicket(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
): TicketDimensions {
  const regionField = detectField(fields, 'region');
  const deviceField = detectField(fields, 'device');
  const issueField = detectField(fields, 'issue');

  const form = forms.find(
    (item) => item.id === ticket.ticket_form_id,
  );

  return {
    region: normalizeRegion(
      fieldValue(ticket, regionField),
    ),
    device:
      fieldValue(ticket, deviceField) || 'Unknown device',
    issue:
      fieldValue(ticket, issueField) || 'Uncategorized',
    form:
      form?.display_name ||
      form?.name ||
      (ticket.ticket_form_id
        ? `Form #${ticket.ticket_form_id}`
        : 'No form'),
  };
}

export function detectedMapping(
  fields: ZendeskTicketField[],
) {
  return {
    region: detectField(fields, 'region'),
    device: detectField(fields, 'device'),
    issue: detectField(fields, 'issue'),
  };
}
