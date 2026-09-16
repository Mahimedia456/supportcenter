import type {
  ZendeskForm,
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';

export type AtomosFieldRole =
  | 'device'
  | 'supportType'
  | 'region'
  | 'category'
  | 'faultCategory'
  | 'rma';

export type TicketDimensions = {
  device: string;
  supportType: string;
  region: string;
  category: string;
  faultCategory: string;
  rma: string;
  issue: string;
  form: string;
};

function norm(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\-\/:()?]+/g, ' ')
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
        stringValue
          .replace(/_/g, ' ')
          .trim()
      );
    })
    .filter(Boolean)
    .join(', ');
}

const ROLE_TERMS: Record<
  AtomosFieldRole,
  string[]
> = {
  device: [
    'device',
    'devices',
    'device model',
    'device name',
    'which device',
    'your device',
    'product',
    'products',
    'product 1',
    'product name',
    'which product',
    'your product',
    'atomos product',
    'atomos device',
    'monitor',
    'monitors',
    'recorder',
    'recorders',
    'model',
    'models',
    'hardware',
  ],
  supportType: [
    'support type',
    'type of support',
    'support category',
    'support request',
    'request type',
    'case type',
  ],
  region: [
    'region',
    'regions',
    'customer region',
    'support region',
    'territory',
    'market',
    'country region',
    'geo',
    'geography',
  ],
  category: [
    'category',
    'issue category',
    'case category',
    'ticket category',
    'support category',
    'issue type',
    'problem category',
  ],
  faultCategory: [
    'fault category',
    'fault categories',
    'fault type',
    'failure category',
    'failure type',
    'fault',
    'failure',
  ],
  rma: [
    'rma',
    'rma type',
    'rma category',
    'return merchandise',
    'return authorization',
    'return type',
  ],
};

function score(
  field: ZendeskTicketField,
  role: AtomosFieldRole,
) {
  const text = norm(
    `${field.title || ''} ${
      field.raw_title || ''
    } ${field.description || ''}`,
  );

  let value = 0;

  ROLE_TERMS[role].forEach(
    (term, index) => {
      if (text.includes(term)) {
        value = Math.max(
          value,
          ROLE_TERMS[role].length -
            index,
        );
      }
    },
  );

  if (
    role === 'category' &&
    (text.includes('fault') ||
      text.includes('rma'))
  ) {
    value = 0;
  }

  if (
    role === 'device' &&
    text.includes('category')
  ) {
    value = Math.max(
      0,
      value - 4,
    );
  }

  return value;
}

export function fieldsForRole(
  fields: ZendeskTicketField[],
  role: AtomosFieldRole,
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

export function firstRoleValue(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  role: AtomosFieldRole,
) {
  for (const field of fieldsForRole(
    fields,
    role,
  )) {
    const value = fieldValue(
      ticket,
      field,
    );

    if (value) {
      return value;
    }
  }

  return '';
}

export function detectedMapping(
  fields: ZendeskTicketField[],
) {
  return {
    device:
      fieldsForRole(
        fields,
        'device',
      )[0],
    supportType:
      fieldsForRole(
        fields,
        'supportType',
      )[0],
    region:
      fieldsForRole(
        fields,
        'region',
      )[0],
    category:
      fieldsForRole(
        fields,
        'category',
      )[0],
    faultCategory:
      fieldsForRole(
        fields,
        'faultCategory',
      )[0],
    rma:
      fieldsForRole(
        fields,
        'rma',
      )[0],
  };
}

function formName(
  ticket: ZendeskTicket,
  forms: ZendeskForm[],
) {
  const form = forms.find(
    (item) =>
      item.id ===
      ticket.ticket_form_id,
  );

  return (
    form?.display_name ||
    form?.name ||
    (ticket.ticket_form_id
      ? `Form #${ticket.ticket_form_id}`
      : 'No form')
  );
}

export function dimensionsForTicket(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  forms: ZendeskForm[],
): TicketDimensions {
  const device =
    firstRoleValue(
      ticket,
      fields,
      'device',
    ) || 'Unknown device';

  const supportType =
    firstRoleValue(
      ticket,
      fields,
      'supportType',
    ) || 'Unspecified';

  const region =
    firstRoleValue(
      ticket,
      fields,
      'region',
    ) || 'Other';

  const category =
    firstRoleValue(
      ticket,
      fields,
      'category',
    ) || 'Uncategorized';

  const faultCategory =
    firstRoleValue(
      ticket,
      fields,
      'faultCategory',
    ) ||
    'No fault category';

  const rma =
    firstRoleValue(
      ticket,
      fields,
      'rma',
    ) || 'No RMA';

  return {
    device,
    supportType,
    region,
    category,
    faultCategory,
    rma,
    issue:
      faultCategory !==
      'No fault category'
        ? faultCategory
        : category !==
            'Uncategorized'
          ? category
          : supportType,
    form: formName(
      ticket,
      forms,
    ),
  };
}

export function roleValues(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  role: AtomosFieldRole,
) {
  const counts =
    new Map<string, number>();

  for (const ticket of tickets) {
    const raw =
      firstRoleValue(
        ticket,
        fields,
        role,
      );

    if (!raw) continue;

    for (const value of raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)) {
      counts.set(
        value,
        (counts.get(value) || 0) +
          1,
      );
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.label.localeCompare(
          b.label,
        ),
    );
}

export function roleOptions(
  fields: ZendeskTicketField[],
  role: AtomosFieldRole,
) {
  const values: string[] = [];
  const seen = new Set<string>();

  for (const field of fieldsForRole(
    fields,
    role,
  )) {
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

export function ticketsForRoleValue(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  role: AtomosFieldRole,
  value: string,
) {
  const wanted =
    value.toLowerCase();

  return tickets.filter((ticket) =>
    firstRoleValue(
      ticket,
      fields,
      role,
    )
      .split(',')
      .map((item) =>
        item.trim().toLowerCase(),
      )
      .includes(wanted),
  );
}
