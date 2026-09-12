import { EMPTY_DIET } from "./diet";
import { registerFood } from "./foodkeeper";
import type { DietPrefs, FoodEntry, InventoryItem, Recipe } from "./types";

export interface Persisted {
  items: InventoryItem[];
  k2Recipes: Recipe[];
  retailer: string | null;
  lastSource: "k2" | "gemini" | "local" | null;
  /** Foods someone typed in that were not in the built-in FoodKeeper table. Survives reset. */
  customFoods: FoodEntry[];
  /** Vegetarian / allergy filter, applied to the recipe library and the K2 prompt. Survives reset. */
  diet: DietPrefs;
  /** Dollars rescued in previous weeks, rolled in each time "reset" starts a new week. */
  lifetimeSaved: number;
}

export const EMPTY_STATE: Persisted = {
  items: [],
  k2Recipes: [],
  retailer: null,
  lastSource: null,
  customFoods: [],
  diet: EMPTY_DIET,
  lifetimeSaved: 0,
};

const STORAGE_KEY = "dining-car:v1";

/** Read persisted state. Client-only: the app shell is loaded with ssr: false. */
export function loadPersisted(): Persisted {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = raw ? { ...EMPTY_STATE, ...(JSON.parse(raw) as Persisted) } : EMPTY_STATE;
    for (const food of state.customFoods) registerFood(food);
    return state;
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
