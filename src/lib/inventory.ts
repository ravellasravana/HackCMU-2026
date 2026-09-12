import { todayISO } from "./dates";
import { ESTIMATED_PRICE } from "./demo";
import { CATEGORY_DEFAULTS, FOOD_BY_ID } from "./foodkeeper";
import { normalizeLine } from "./normalize";
import type { Category, ExtractedLine, InventoryItem } from "./types";

export const CONFIDENCE_CONFIRM_THRESHOLD = 0.7;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function lineToItem(line: ExtractedLine, purchaseDate: string, source: InventoryItem["source"]): InventoryItem {
  const entry = line.foodId ? FOOD_BY_ID[line.foodId] : undefined;
  const category: Category = entry?.category ?? line.category ?? "produce";
  const fallback = CATEGORY_DEFAULTS[category];
  return {
    id: newId(),
    rawLine: line.rawLine,
    foodId: line.foodId ?? "unknown",
    displayName: entry?.name ?? line.displayName,
    emoji: entry?.emoji ?? fallback.emoji,
    category,
    quantity: line.quantity,
    unit: line.unit,
    price: line.price > 0 ? line.price : ESTIMATED_PRICE[category],
    purchaseDate,
    storage: entry?.defaultStorage ?? fallback.defaultStorage,
    opened: false,
    confidence: line.confidence,
    confirmed: line.confidence >= CONFIDENCE_CONFIRM_THRESHOLD,
    staple: Boolean(entry?.staple),
    source,
  };
}

/** "avocados" or "2 avocados $3.58" typed by hand → inventory item bought today. */
export function manualItem(text: string): InventoryItem | null {
  const line = normalizeLine(text);
  if (!line) return null;
  return lineToItem(line, todayISO(), "manual");
}

/** Re-point an item at a different FoodKeeper entry (the confirm tap). */
export function reassignFood(item: InventoryItem, foodId: string): InventoryItem {
  const entry = FOOD_BY_ID[foodId];
  if (!entry) return item;
  return {
    ...item,
    foodId,
    displayName: entry.name,
    emoji: entry.emoji,
    category: entry.category,
    storage: entry.defaultStorage,
    staple: Boolean(entry.staple),
    confidence: 1,
    confirmed: true,
  };
}
