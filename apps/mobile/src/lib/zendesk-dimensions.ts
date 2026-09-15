import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';

function normalize(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function fieldValue(
  ticket: ZendeskTicket,
  field: ZendeskTicketField,
) {
  const raw =
    ticket.custom_fields?.find(
      (item) =>
        item.id === field.id,
    )?.value;

  if (
    raw === null ||
    raw === undefined ||
    raw === ''
  ) {
    return '';
  }

  const values = Array.isArray(raw)
    ? raw
    : [raw];

  return values
    .map((value) => {
      const stringValue =
        String(value);

      const option =
        field.custom_field_options?.find(
          (item) =>
            item.value ===
            stringValue,
        );

      return (
        option?.name ||
        option?.raw_name ||
        stringValue.replace(
          /_/g,
          ' ',
        )
      );
    })
    .join(', ');
}

type Role =
  | 'region'
  | 'product'
  | 'issue';

const ROLE_TERMS: Record<
  Role,
  string[]
> = {
  region: [
    'region',
    'territory',
    'market',
    'country',
    'geo',
  ],
  product: [
    'atomos product',
    'product 1',
    'product',
    'device',
    'device model',
    'model',
    'hardware',
    'monitor',
    'recorder',
  ],
  issue: [
    'issue category',
    'issue',
    'fault',
    'problem',
    'symptom',
    'failure',
    'rma type',
    'case type',
    'reason',
  ],
};

function score(
  field: ZendeskTicketField,
  role: Role,
) {
  const haystack = normalize(
    `${field.title || ''} ${
      field.raw_title || ''
    } ${field.description || ''}`,
  );

  return ROLE_TERMS[role].reduce(
    (total, term, index) =>
      total +
      (haystack.includes(term)
        ? ROLE_TERMS[role].length -
          index
        : 0),
    0,
  );
}

export function candidateFields(
  fields: ZendeskTicketField[],
  role: Role,
) {
  return fields
    .filter(
      (field) =>
        field.active !== false,
    )
    .map((field) => ({
      field,
      score: score(field, role),
    }))
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (a.field.position ?? 9999) -
          (b.field.position ?? 9999),
    )
    .map((row) => row.field);
}

function firstValue(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  role: Role,
) {
  for (const field of candidateFields(
    fields,
    role,
  )) {
    const value =
      fieldValue(ticket, field);

    if (value) return value;
  }

  return '';
}

export function dimensionsForTicket(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
) {
  const form = forms.find(
    (item) =>
      item.id ===
      ticket.ticket_form_id,
  );

  return {
    region:
      firstValue(
        ticket,
        fields,
        'region',
      ) || 'Other',
    device:
      firstValue(
        ticket,
        fields,
        'product',
      ) || 'Unknown product',
    issue:
      firstValue(
        ticket,
        fields,
        'issue',
      ) || 'Uncategorized',
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
    region:
      candidateFields(
        fields,
        'region',
      )[0],
    device:
      candidateFields(
        fields,
        'product',
      )[0],
    issue:
      candidateFields(
        fields,
        'issue',
      )[0],
    productCandidates:
      candidateFields(
        fields,
        'product',
      ),
  };
}

export function allProductOptions(
  fields: ZendeskTicketField[],
) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const field of candidateFields(
    fields,
    'product',
  ).slice(0, 3)) {
    for (const option of
      field.custom_field_options ||
      []) {
      const label =
        option.name ||
        option.raw_name ||
        option.value;

      const key =
        label.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        values.push(label);
      }
    }
  }

  return values;
}
