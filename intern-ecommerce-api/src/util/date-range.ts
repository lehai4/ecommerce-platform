import { BadRequestException } from '@nestjs/common';

/** Time zone used to cut days for reports ("today", daily charts...) */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minutes the time zone is ahead of UTC at `date` (e.g. +420 for Vietnam) */
export function timezoneOffsetMinutes(date: Date, timeZone = APP_TIMEZONE): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const wallClockAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((wallClockAsUtc - date.getTime()) / 60000);
}

/** "2026-11-23" -> the instant that day starts in the app time zone */
export function startOfDay(day: string, timeZone = APP_TIMEZONE): Date {
  const match = DATE_RE.exec(day);
  if (!match) {
    throw new BadRequestException(`Invalid date "${day}", use YYYY-MM-DD`);
  }
  const utcMidnight = Date.UTC(+match[1], +match[2] - 1, +match[3]);
  const offset = timezoneOffsetMinutes(new Date(utcMidnight), timeZone);
  return new Date(utcMidnight - offset * 60000);
}

/** Today's date ("YYYY-MM-DD") in the app time zone */
export function todayString(timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
}

/** Adds days to a "YYYY-MM-DD" string */
export function addDays(day: string, days: number): string {
  const match = DATE_RE.exec(day);
  if (!match) throw new BadRequestException(`Invalid date "${day}"`);
  return new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Number of days from `from` to `to`, both included */
export function daysBetween(from: string, to: string): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS) + 1;
}

/** [gte, lt) bounds for a day range, both days included. */
export function dayRange(from?: string, to?: string): { gte?: Date; lt?: Date } {
  return {
    gte: from ? startOfDay(from) : undefined,
    lt: to ? startOfDay(addDays(to, 1)) : undefined,
  };
}
