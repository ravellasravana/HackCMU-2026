export type Storage = "fridge" | "pantry" | "freezer";

export type Category =
  | "produce"
  | "dairy"
  | "eggs"
  | "meat"
  | "seafood"
  | "bakery"
  | "deli"
  | "beverage"
  | "frozen"
  | "pantry";

/** One row of the (abridged) USDA FoodKeeper table. All durations are days. */
export interface FoodEntry {
  id: string;
  name: string;
  emoji: string;
  category: Category;
  aliases: string[];
  pantryDays?: number;
  fridgeDays?: number;
  freezerDays?: number;
  /** Fridge life once the package is opened, when FoodKeeper distinguishes it. */
  openedFridgeDays?: number;
  /** Where the item lives when it comes home from the store. */
  defaultStorage: Storage;
  /** Long-life staple that is always "in stock" and costs nothing to a plan. */
  staple?: boolean;
}

export interface InventoryItem {
  id: string;
  rawLine: string;
  foodId: string;
  displayName: string;
  emoji: string;
  category: Category;
  quantity: number;
  unit?: string;
  price: number;
  /** ISO date (YYYY-MM-DD) */
  purchaseDate: string;
  storage: Storage;
  opened: boolean;
  /** 0..1 — how sure the normalizer is that rawLine maps to foodId. */
  confidence: number;
  /** User tapped confirm (or the match was confident enough not to ask). */
  confirmed: boolean;
  staple: boolean;
  source: "receipt" | "manual" | "voice";
}

export interface RecipeIngredient {
  foodId: string;
  /** Recipe falls apart without it. Missing key ingredient = infeasible. */
  key?: boolean;
  optional?: boolean;
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  emoji: string;
  minutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  /** Pantry staples the recipe assumes (salt, oil, ...) — free and always available. */
  staples: string[];
  steps: string[];
  /** Lower = what people tend to cook first when they have no plan. */
  popularity: number;
  source: "library" | "k2";
}

export interface ExtractedLine {
  rawLine: string;
  foodId: string | null;
  displayName: string;
  quantity: number;
  unit?: string;
  price: number;
  confidence: number;
  category?: Category;
}

/** Result of any "here's what I bought" input method — pasted receipt or spoken sentence. */
export interface ExtractResult {
  lines: ExtractedLine[];
  meta: { retailer: string | null; purchaseDate: string | null };
  source: "k2" | "local" | "voice";
  warning?: string;
  fallbackDate: string;
}
