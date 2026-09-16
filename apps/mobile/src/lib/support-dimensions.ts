
import type {
  ZendeskTicket,
  ZendeskTicketField,
} from '@/lib/api';

export type SupportDimension =
  | 'device'
  | 'supportType'
  | 'region'
  | 'category'
  | 'faultCategory'
  | 'rma';

const MATCHERS: Record<SupportDimension, string[]> = {
  device: [
    'device',
    'device model',
    'device name',
    'product',
    'product 1',
    'product name',
    'atomos product',
    'atomos device',
    'monitor',
    'recorder',
    'model',
    'hardware',
  ],
  supportType: [
    'support type',
    'support request',
    'request type',
    'case type',
  ],
  region: [
    'region',
    'country region',
    'market',
    'territory',
  ],
  category: [
    'category',
    'ticket category',
    'issue category',
  ],
  faultCategory: [
    'fault',
    'fault category',
    'failure',
    'issue type',
    'problem category',
  ],
  rma: [
    'rma',
    'rma type',
    'return merchandise',
    'return type',
  ],
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function fieldForDimension(
  fields: ZendeskTicketField[],
  dimension: SupportDimension,
): ZendeskTicketField | undefined {
  const terms = MATCHERS[dimension];

  return fields.find((field: ZendeskTicketField) => {
    const source = field as any;

    const title = normalize(
      source.title ||
        source.raw_title ||
        source.description ||
        '',
    );

    return terms.some(
      (term: string) =>
        title === term ||
        title.includes(term),
    );
  });
}

function optionLabel(
  field: any,
  raw: unknown,
): string {
  if (
    raw === null ||
    raw === undefined ||
    raw === ''
  ) {
    return '';
  }

  if (Array.isArray(raw)) {
    return raw
      .map((item: unknown): string =>
        optionLabel(field, item),
      )
      .filter(
        (item: string): boolean =>
          Boolean(item),
      )
      .join(', ');
  }

  const rawString = String(raw);

  const options: any[] =
    field?.custom_field_options ||
    field?.system_field_options ||
    [];

  const option = options.find(
    (item: any): boolean =>
      String(item.value) === rawString ||
      String(item.id) === rawString,
  );

  return String(
    option?.name ||
      option?.raw_name ||
      rawString,
  ).trim();
}

export function dimensionValue(
  ticket: ZendeskTicket,
  fields: ZendeskTicketField[],
  dimension: SupportDimension,
): string {
  const field: any =
    fieldForDimension(fields, dimension);

  if (!field) return '';

  const customFields: any[] =
    ((ticket as any).custom_fields || []) as any[];

  const custom = customFields.find(
    (item: any): boolean =>
      Number(item.id) === Number(field.id),
  );

  return optionLabel(
    field,
    custom?.value,
  );
}

export type DimensionRow = {
  label: string;
  count: number;
};

export function dimensionRows(
  tickets: ZendeskTicket[],
  fields: ZendeskTicketField[],
  dimension: SupportDimension,
): DimensionRow[] {
  const counts =
    new Map<string, number>();

  for (const ticket of tickets) {
    const raw =
      dimensionValue(
        ticket,
        fields,
        dimension,
      );

    const parts: string[] =
      raw
        .split(',')
        .map(
          (item: string): string =>
            item.trim(),
        )
        .filter(
          (item: string): boolean =>
            Boolean(item),
        );

    for (const part of parts) {
      counts.set(
        part,
        (counts.get(part) || 0) + 1,
      );
    }
  }

  return [...counts.entries()]
    .map(
      ([label, count]): DimensionRow => ({
        label,
        count,
      }),
    )
    .sort(
      (a: DimensionRow, b: DimensionRow) =>
        b.count - a.count,
    );
}

export function isTruthyDimension(
  value: string,
): boolean {
  const normalized =
    normalize(value);

  return (
    Boolean(normalized) &&
    ![
      'no',
      'none',
      'false',
      'not applicable',
      'n a',
      'na',
      'no rma',
      'no fault',
    ].includes(normalized)
  );
}
