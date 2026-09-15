export type TicketStatusTone = 'open' | 'pending' | 'hold' | 'solved' | 'closed' | 'new';

export function statusLabel(value?: string | null) {
  return String(value || 'open').toUpperCase();
}

export function relativeTime(value?: string | null) {
  if (!value) return '—';

  const then = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function readableDate(value?: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
