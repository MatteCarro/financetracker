import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  addWeeks,
  addYears,
  isBefore,
  isAfter,
  differenceInMonths,
  differenceInDays,
} from 'date-fns'
import { it } from 'date-fns/locale'
import type { Frequency } from './types'

export function formatDate(d: Date): string {
  return format(d, 'dd/MM/yyyy', { locale: it })
}

export function formatDateShort(d: Date): string {
  return format(d, 'dd MMM', { locale: it })
}

export function formatMonthYear(d: Date): string {
  return format(d, 'MMMM yyyy', { locale: it })
}

export function formatDatetime(d: Date): string {
  return format(d, "dd/MM/yyyy 'alle' HH:mm", { locale: it })
}

export function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date()
  return { start: startOfMonth(now), end: endOfMonth(now) }
}

export function nextOccurrence(from: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'mensile':
      return addMonths(from, 1)
    case 'settimanale':
      return addWeeks(from, 1)
    case 'annuale':
      return addYears(from, 1)
    default:
      return addMonths(from, 1)
  }
}

export function daysUntil(d: Date): number {
  return differenceInDays(d, new Date())
}

export function monthsUntil(d: Date): number {
  return differenceInMonths(d, new Date())
}

export function isExpired(d: Date): boolean {
  return isBefore(d, new Date())
}

export function isUpcoming(d: Date, withinDays = 7): boolean {
  const now = new Date()
  const limit = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
  return isAfter(d, now) && isBefore(d, limit)
}

export { isBefore, isAfter, startOfMonth, endOfMonth, addMonths }
