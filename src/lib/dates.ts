import { FOOD_BY_ID, shelfLifeDays } from "./foodkeeper";
import type { InventoryItem } from "./types";

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = parseISODate(fromISO).getTime();
  const b = parseISODate(toISO).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function eatByDate(item: InventoryItem): string | null {
  if (item.eatByOverride) return item.eatByOverride;
  const entry = FOOD_BY_ID[item.foodId];
  const life = shelfLifeDays(entry, item.storage, item.opened, item.category);
  if (life === undefined) return null;
  return addDays(item.purchaseDate, life);
}

/** Days from `today` until the item's eat-by date. Negative = already past. */
export function daysLeft(item: InventoryItem, today: string): number | null {
  const eatBy = eatByDate(item);
  if (!eatBy) return null;
  return daysBetween(today, eatBy);
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatRelativeDay(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff < 0) return `${-diff} days ago`;
  if (diff < 7) return WEEKDAY[parseISODate(iso).getDay()];
  const d = parseISODate(iso);
  return `${MONTH[d.getMonth()]} ${d.getDate()}`;
}

export function formatShortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAY[d.getDay()]} ${MONTH[d.getMonth()]} ${d.getDate()}`;
}

export function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTH[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}
