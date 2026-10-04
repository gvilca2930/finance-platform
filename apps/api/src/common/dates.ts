import { BadRequestException } from '@nestjs/common';

export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function resolvePeriod(
  timezone: string,
  from?: string,
  to?: string,
): { from: Date; to: Date; fromString: string; toString: string } {
  if ((from && !to) || (!from && to)) {
    throw new BadRequestException('from and to must be provided together');
  }
  if (from && to) {
    const fromDate = dateOnly(from);
    const toDate = dateOnly(to);
    if (fromDate > toDate) throw new BadRequestException('from must not be after to');
    return { from: fromDate, to: toDate, fromString: from, toString: to };
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const fromString = `${year}-${String(month).padStart(2, '0')}-01`;
  const toString = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from: dateOnly(fromString), to: dateOnly(toString), fromString, toString };
}
