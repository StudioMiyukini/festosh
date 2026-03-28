import {
  format,
  formatRelative as fnsFormatRelative,
  isBefore,
  isAfter,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";

type DateInput = Date | string;

/** Safely convert a date input to a Date object. */
function toDate(date: DateInput): Date {
  if (typeof date === "string") {
    return parseISO(date);
  }
  return date;
}

/**
 * Format a date as a localized date string.
 * @example formatDate("2025-07-14") => "14 juillet 2025"
 */
export function formatDate(date: DateInput): string {
  return format(toDate(date), "d MMMM yyyy", { locale: fr });
}

/**
 * Format a date as a localized date and time string.
 * @example formatDateTime("2025-07-14T20:00:00Z") => "14 juillet 2025 a 20:00"
 */
export function formatDateTime(date: DateInput): string {
  return format(toDate(date), "d MMMM yyyy 'a' HH:mm", { locale: fr });
}

/**
 * Format a date relative to the current date.
 * @example formatRelative("2025-07-14") => "lundi prochain"
 */
export function formatRelative(date: DateInput): string {
  return fnsFormatRelative(toDate(date), new Date(), { locale: fr });
}

/**
 * Check if a date is in the future.
 */
export function isUpcoming(date: DateInput): boolean {
  return isAfter(toDate(date), new Date());
}

/**
 * Check if a date is in the past.
 */
export function isPast(date: DateInput): boolean {
  return isBefore(toDate(date), new Date());
}
