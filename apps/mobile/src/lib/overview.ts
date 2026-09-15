import type { ZendeskTicket } from '@/lib/api';

export type OverviewPeriod = 'today' | '7d' | '30d';

export function periodStart(period: OverviewPeriod) {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }

  const days = period === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function ticketsForPeriod(
  tickets: ZendeskTicket[],
  period: OverviewPeriod,
) {
  const start = periodStart(period);

  return tickets.filter((ticket) => {
    const value = new Date(ticket.created_at || ticket.updated_at || 0).getTime();
    return Number.isFinite(value) && value >= start;
  });
}

export function deriveRegion(ticket: ZendeskTicket) {
  const haystack = [
    ticket.subject || '',
    ticket.description || '',
    ...(ticket.tags || []),
  ]
    .join(' ')
    .toLowerCase();

  const rules: Array<[string, string[]]> = [
    ['Europe', ['europe', 'eu_', 'region_eu', 'uk', 'germany', 'france', 'italy', 'spain']],
    ['EMEA', ['emea', 'middle_east', 'middle east', 'africa', 'uae', 'dubai']],
    ['US', ['region_us', 'usa', 'united states', 'north_america', 'north america']],
    ['APAC', ['apac', 'asia', 'australia', 'japan', 'singapore']],
  ];

  for (const [label, needles] of rules) {
    if (needles.some((needle) => haystack.includes(needle))) return label;
  }

  return 'Other';
}

export function overviewMetrics(tickets: ZendeskTicket[]) {
  const open = tickets.filter((t) =>
    ['new', 'open'].includes(String(t.status || '').toLowerCase()),
  ).length;

  const pending = tickets.filter(
    (t) => String(t.status || '').toLowerCase() === 'pending',
  ).length;

  const unassigned = tickets.filter((t) => !t.assignee_id).length;

  const highPriority = tickets.filter((t) =>
    ['high', 'urgent'].includes(String(t.priority || '').toLowerCase()),
  ).length;

  const regions = new Map<string, number>();
  for (const ticket of tickets) {
    const region = deriveRegion(ticket);
    regions.set(region, (regions.get(region) || 0) + 1);
  }

  const regionRows = [...regions.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: tickets.length,
    open,
    pending,
    unassigned,
    highPriority,
    regionRows,
  };
}
