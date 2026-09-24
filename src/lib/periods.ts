import { addMonths, addWeeks, format, parseISO, startOfISOWeek, startOfMonth, subDays } from 'date-fns';
import { tr } from 'date-fns/locale';

export type PeriodType = 'week' | 'month';

const ISO = 'yyyy-MM-dd';

// Tarih stringleri her zaman parseISO ile yerel gün olarak okunur; new Date('YYYY-MM-DD') UTC'dir ve gün kaydırır.
export function todayIso(): string {
  return format(new Date(), ISO);
}

export function periodStart(date: string, type: PeriodType): string {
  const d = parseISO(date);
  return format(type === 'week' ? startOfISOWeek(d) : startOfMonth(d), ISO);
}

export function shiftPeriod(start: string, type: PeriodType, n: number): string {
  const d = parseISO(start);
  return format(type === 'week' ? addWeeks(d, n) : addMonths(d, n), ISO);
}

export function dayBefore(date: string): string {
  return format(subDays(parseISO(date), 1), ISO);
}

export function periodsBetween(from: string, to: string, type: PeriodType): string[] {
  if (from > to) return [];
  const out: string[] = [];
  const last = periodStart(to, type);
  for (let cur = periodStart(from, type); cur <= last; cur = shiftPeriod(cur, type, 1)) out.push(cur);
  return out;
}

export function periodLabel(start: string, type: PeriodType): string {
  return format(parseISO(start), type === 'week' ? 'd MMM' : 'MMM yyyy', { locale: tr });
}

export function defaultRange(today: string, type: PeriodType): { from: string; to: string } {
  return { from: shiftPeriod(periodStart(today, type), type, -11), to: today };
}

export function formatDateTr(date: string): string {
  return format(parseISO(date), 'd MMM yyyy', { locale: tr });
}
