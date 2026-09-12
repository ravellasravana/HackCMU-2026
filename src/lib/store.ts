import type { InventoryItem, Recipe } from "./types";

export interface Persisted {
  items: InventoryItem[];
  k2Recipes: Recipe[];
  retailer: string | null;
  lastSource: "k2" | "local" | "voice" | "photo" | null;
}

export const EMPTY_STATE: Persisted = { items: [], k2Recipes: [], retailer: null, lastSource: null };

const STORAGE_KEY = "dining-car:v1";

/** Read persisted state. Client-only: the app shell is loaded with ssr: false. */
export function loadPersisted(): Persisted {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Persisted) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

export function savePersisted(state: Persisted): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — keep in-memory state */
  }
}
