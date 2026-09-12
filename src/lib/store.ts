import type { InventoryItem, Recipe } from "./types";

export interface Persisted {
  items: InventoryItem[];
  k2Recipes: Recipe[];
  retailer: string | null;
  lastSource: "k2" | "local" | null;
}

export const EMPTY_STATE: Persisted = { items: [], k2Recipes: [], retailer: null, lastSource: null };

const STORAGE_KEY = "dining-car:v1";
const listeners = new Set<() => void>();
let snapshot: Persisted | null = null;

/** Tiny localStorage-backed external store so the UI can use useSyncExternalStore without effects. */
function load(): Persisted {
  if (snapshot) return snapshot;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    snapshot = raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Persisted) } : EMPTY_STATE;
  } catch {
    snapshot = EMPTY_STATE;
  }
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): Persisted | null {
  return load();
}

export function getServerSnapshot(): Persisted | null {
  return null;
}

export function setPersisted(updater: Persisted | ((prev: Persisted) => Persisted)): void {
  const prev = load();
  snapshot = typeof updater === "function" ? updater(prev) : updater;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* storage full or unavailable — keep in-memory state */
  }
  for (const l of listeners) l();
}
