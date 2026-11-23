import { Prisma } from '@prisma/client';

/** Schema from DATABASE_URL (?schema=...). Raw SQL must name it explicitly. */
export const DB_SCHEMA = (() => {
  const url = process.env.DATABASE_URL ?? '';
  const match = /[?&]schema=([^&]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : 'public';
})();

/** "schema"."Table" for raw SQL */
export const table = (name: string) =>
  Prisma.raw(`"${DB_SCHEMA.replace(/"/g, '')}"."${name.replace(/"/g, '')}"`);

/**
 * Timestamp literal for raw SQL. Timestamps are stored as UTC without zone.
 * Inlined (not a bind parameter) because Prisma 3 sends parameters in a binary
 * format Postgres rejects for timestamp casts. Safe: built from a Date by us.
 */
export const tsLiteral = (date: Date) =>
  Prisma.raw(`'${date.toISOString().replace('Z', '').replace(/[^0-9T:.-]/g, '')}'::timestamp`);

/** Integer literal for LIMIT/OFFSET, same reason as above */
export const intLiteral = (value: number) =>
  Prisma.raw(String(Math.max(0, Math.trunc(Number(value) || 0))));

/** Time zone name literal (validated) */
export const timezoneLiteral = (timeZone: string) => {
  if (!/^[A-Za-z0-9_+\-/]+$/.test(timeZone)) {
    throw new Error(`Invalid time zone "${timeZone}"`);
  }
  return Prisma.raw(`'${timeZone}'`);
};
