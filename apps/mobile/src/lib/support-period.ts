
import type { ZendeskTicket } from '@/lib/api';

export type SupportPeriodPreset =
  | 'today'
  | '7'
  | '30'
  | '90'
  | 'month0'
  | 'month1'
  | 'month2'
  | 'custom';

export type SupportPeriod = {
  preset: SupportPeriodPreset;
  start?: string;
  end?: string;
};

export const DEFAULT_SUPPORT_PERIOD: SupportPeriod = {
  preset: '90',
};

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth() - offset,
    1,
  );

  const naturalEnd = new Date(
    now.getFullYear(),
    now.getMonth() - offset + 1,
    0,
  );

  const end =
    offset === 0 && naturalEnd > now
      ? now
      : naturalEnd;

  return {
    start: startOfDay(start),
    end: endOfDay(end),
  };
}

export function supportPeriodRange(
  period: SupportPeriod,
) {
  const now = new Date();

  if (period.preset === 'today') {
    return {
      start: startOfDay(now),
      end: endOfDay(now),
    };
  }

  if (period.preset === 'month0') {
    return monthRange(0);
  }

  if (period.preset === 'month1') {
    return monthRange(1);
  }

  if (period.preset === 'month2') {
    return monthRange(2);
  }

  if (
    period.preset === 'custom' &&
    period.start &&
    period.end
  ) {
    return {
      start: startOfDay(
        new Date(period.start),
      ),
      end: endOfDay(
        new Date(period.end),
      ),
    };
  }

  const days =
    Number(period.preset || 90);

  const start = new Date(now);
  start.setDate(
    start.getDate() -
      Math.max(1, days) +
      1,
  );

  return {
    start: startOfDay(start),
    end: endOfDay(now),
  };
}

export function filterTicketsBySupportPeriod(
  tickets: ZendeskTicket[],
  period: SupportPeriod,
) {
  const range =
    supportPeriodRange(period);

  return tickets.filter(
    (ticket) => {
      const raw =
        ticket.created_at ||
        ticket.updated_at;

      if (!raw) {
        return false;
      }

      const time =
        new Date(raw).getTime();

      return (
        time >=
          range.start.getTime() &&
        time <=
          range.end.getTime()
      );
    },
  );
}

export function lastThreeMonthLabels() {
  const format =
    new Intl.DateTimeFormat(
      'en',
      {
        month: 'short',
      },
    );

  const now = new Date();

  return [0, 1, 2].map(
    (offset) => {
      const date =
        new Date(
          now.getFullYear(),
          now.getMonth() -
            offset,
          1,
        );

      return format.format(
        date,
      );
    },
  );
}
