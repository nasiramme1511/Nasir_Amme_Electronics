/**
 * Nasir Amme Electronics — Business Timezone & Date Range Utilities
 * Timezone: Africa/Addis_Ababa (East Africa Time, UTC+3, no DST)
 * Location: Dire Dawa, Ethiopia
 */

export const STORE_TIMEZONE = 'Africa/Addis_Ababa';
export const STORE_UTC_OFFSET_HOURS = 3; // EAT is UTC+3 permanently

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'custom';

export interface BusinessPeriod {
  preset: DateRangePreset;
  label: string;
  startDate: Date;
  endDate: Date;
  previousPeriod: {
    label: string;
    startDate: Date;
    endDate: Date;
  };
}

interface EATDateParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number;
  minute: number;
  second: number;
}

/**
 * Extracts date and time components in Africa/Addis_Ababa (EAT).
 */
export function getEATParts(date: Date = new Date()): EATDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
  };
}

/**
 * Creates a UTC Date representing 00:00:00.000 in Africa/Addis_Ababa for a given local Y-M-D.
 * 00:00:00 EAT is 21:00:00 UTC of the previous calendar day.
 */
export function createEATStartOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, -STORE_UTC_OFFSET_HOURS, 0, 0, 0));
}

/**
 * Creates a UTC Date representing 23:59:59.999 in Africa/Addis_Ababa for a given local Y-M-D.
 * 23:59:59.999 EAT is 20:59:59.999 UTC of the same calendar day.
 */
export function createEATEndOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 24 - STORE_UTC_OFFSET_HOURS - 1, 59, 59, 999));
}

/**
 * Calculates authoritative business period boundaries and corresponding previous period
 * comparison window according to Ethiopian retail accounting practice.
 */
export function getBusinessDateRange(
  preset: DateRangePreset = 'today',
  customStart?: string | Date,
  customEnd?: string | Date,
  referenceDate: Date = new Date()
): BusinessPeriod {
  const eatNow = getEATParts(referenceDate);
  const todayStart = createEATStartOfDay(eatNow.year, eatNow.month, eatNow.day);
  const todayEnd = createEATEndOfDay(eatNow.year, eatNow.month, eatNow.day);

  switch (preset) {
    case 'today': {
      // Previous period: Yesterday
      const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yestEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
      return {
        preset: 'today',
        label: 'Today',
        startDate: todayStart,
        endDate: todayEnd,
        previousPeriod: {
          label: 'Yesterday',
          startDate: yestStart,
          endDate: yestEnd,
        },
      };
    }

    case 'yesterday': {
      const yestStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yestEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);
      const dayBeforeStart = new Date(yestStart.getTime() - 24 * 60 * 60 * 1000);
      const dayBeforeEnd = new Date(yestEnd.getTime() - 24 * 60 * 60 * 1000);
      return {
        preset: 'yesterday',
        label: 'Yesterday',
        startDate: yestStart,
        endDate: yestEnd,
        previousPeriod: {
          label: 'Previous Day',
          startDate: dayBeforeStart,
          endDate: dayBeforeEnd,
        },
      };
    }

    case 'last_7_days': {
      // 7 calendar days ending today (6 days prior start-of-day through today end-of-day)
      const start = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
      const end = todayEnd;
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - 7 * 24 * 60 * 60 * 1000 + 1);
      return {
        preset: 'last_7_days',
        label: 'Last 7 Days',
        startDate: start,
        endDate: end,
        previousPeriod: {
          label: 'Prior 7 Days',
          startDate: prevStart,
          endDate: prevEnd,
        },
      };
    }

    case 'last_30_days': {
      // 30 calendar days ending today
      const start = new Date(todayStart.getTime() - 29 * 24 * 60 * 60 * 1000);
      const end = todayEnd;
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - 30 * 24 * 60 * 60 * 1000 + 1);
      return {
        preset: 'last_30_days',
        label: 'Last 30 Days',
        startDate: start,
        endDate: end,
        previousPeriod: {
          label: 'Prior 30 Days',
          startDate: prevStart,
          endDate: prevEnd,
        },
      };
    }

    case 'this_month': {
      const monthStart = createEATStartOfDay(eatNow.year, eatNow.month, 1);
      const monthEnd = todayEnd;
      // Previous equivalent period: previous calendar month start to previous calendar month same elapsed days
      const prevYear = eatNow.month === 1 ? eatNow.year - 1 : eatNow.year;
      const prevMonth = eatNow.month === 1 ? 12 : eatNow.month - 1;
      const prevMonthStart = createEATStartOfDay(prevYear, prevMonth, 1);
      const daysElapsed = eatNow.day;
      const prevMonthEnd = createEATEndOfDay(prevYear, prevMonth, Math.min(daysElapsed, 28));

      return {
        preset: 'this_month',
        label: 'This Month',
        startDate: monthStart,
        endDate: monthEnd,
        previousPeriod: {
          label: 'Prior Month Equivalent',
          startDate: prevMonthStart,
          endDate: prevMonthEnd,
        },
      };
    }

    case 'custom': {
      let start: Date;
      let end: Date;

      if (customStart) {
        const d = typeof customStart === 'string' ? new Date(customStart) : customStart;
        const p = getEATParts(d);
        start = createEATStartOfDay(p.year, p.month, p.day);
      } else {
        start = todayStart;
      }

      if (customEnd) {
        const d = typeof customEnd === 'string' ? new Date(customEnd) : customEnd;
        const p = getEATParts(d);
        end = createEATEndOfDay(p.year, p.month, p.day);
      } else {
        end = todayEnd;
      }

      if (start > end) {
        // Swap if reversed
        const temp = start;
        start = end;
        end = temp;
      }

      const durationMs = end.getTime() - start.getTime() + 1;
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - durationMs + 1);

      return {
        preset: 'custom',
        label: 'Custom Range',
        startDate: start,
        endDate: end,
        previousPeriod: {
          label: 'Prior Equivalent Period',
          startDate: prevStart,
          endDate: prevEnd,
        },
      };
    }
  }
}

/**
 * Formats a timestamp into Dire Dawa store business time: e.g. "23 Oct 2026, 06:15 PM EAT"
 */
export function formatStoreDateTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: STORE_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a timestamp into short business date: e.g. "23 Oct 2026"
 */
export function formatStoreDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: STORE_TIMEZONE,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats a timestamp into store business time: e.g. "06:15 PM"
 */
export function formatStoreTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: STORE_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return String(dateInput);
  }
}
