import { addDays, daysLeft as computeDaysLeft, eatByDate } from "./dates";
import { FOOD_BY_ID } from "./foodkeeper";
import type { InventoryItem, Recipe } from "./types";

export const HORIZON_NIGHTS = 7;
/** Grounding threshold: recipes must use at least this fraction of ingredients you own. */
export const GROUNDING_THRESHOLD = 0.8;
/** Cap on at-risk items tracked exactly by the DP (2^16 masks per night is still ~ms). */
const MAX_DP_ITEMS = 16;

export interface DatedItem extends InventoryItem {
  eatBy: string | null;
  daysLeft: number | null;
}

export interface GroundingResult {
  score: number;
  owned: number;
  total: number;
  missing: string[];
  passes: boolean;
  usedItemIds: string[];
}

export interface NightPlan {
  dayOffset: number;
  date: string;
  recipe: Recipe | null;
  grounding: GroundingResult | null;
  /** Dollar value of at-risk items this dinner rescues (first use counts). */
  valueSaved: number;
  rescuedItemIds: string[];
}

export type Decision =
  | { kind: "freeze"; item: DatedItem; freezeBy: string; goodUntil: string; value: number }
  | { kind: "eat-now"; item: DatedItem; by: string; value: number };

export interface Plan {
  nights: NightPlan[];
  atRisk: DatedItem[];
  atRiskValue: number;
  savedByCooking: number;
  savedByFreezing: number;
  wasted: number;
  wastedNoPlan: number;
  wastedEarliestFirst: number;
  decisions: Decision[];
  alreadyExpired: DatedItem[];
  coveredItemIds: Set<string>;
}

export function withDates(items: InventoryItem[], today: string): DatedItem[] {
  return items.map((item) => ({
    ...item,
    eatBy: eatByDate(item),
    daysLeft: computeDaysLeft(item, today),
  }));
}

function availableOn(item: DatedItem, dayOffset: number): boolean {
  if (item.daysLeft === null) return true;
  return item.daysLeft >= dayOffset;
}

/**
 * Verify a recipe against what is actually in the kitchen on a given night.
 * Staples count as owned; optional ingredients only count when present.
 */
export function groundRecipe(recipe: Recipe, items: DatedItem[], dayOffset: number): GroundingResult {
  let owned = recipe.staples.length;
  let total = recipe.staples.length;
  const missing: string[] = [];
  const usedItemIds: string[] = [];
  let keyMissing = false;

  for (const ing of recipe.ingredients) {
    const matches = items.filter((it) => it.foodId === ing.foodId && availableOn(it, dayOffset));
    if (matches.length) {
      owned++;
      total++;
      for (const m of matches) usedItemIds.push(m.id);
    } else if (!ing.optional) {
      total++;
      missing.push(FOOD_BY_ID[ing.foodId]?.name ?? ing.foodId);
      if (ing.key) keyMissing = true;
    }
  }
  const score = total === 0 ? 0 : owned / total;
  return {
    score,
    owned,
    total,
    missing,
    passes: !keyMissing && score >= GROUNDING_THRESHOLD,
    usedItemIds,
  };
}

interface FeasibleRecipe {
  recipe: Recipe;
  grounding: GroundingResult;
  mask: number;
  atRiskIds: string[];
}

function feasibleOn(recipes: Recipe[], items: DatedItem[], dayOffset: number, bitOf: Map<string, number>): FeasibleRecipe[] {
  const out: FeasibleRecipe[] = [];
  for (const recipe of recipes) {
    const grounding = groundRecipe(recipe, items, dayOffset);
    if (!grounding.passes) continue;
    let mask = 0;
    const atRiskIds: string[] = [];
    for (const id of grounding.usedItemIds) {
      const bit = bitOf.get(id);
      if (bit !== undefined) {
        mask |= 1 << bit;
        atRiskIds.push(id);
      }
    }
    out.push({ recipe, grounding, mask, atRiskIds });
  }
  return out;
}

function maskValue(mask: number, values: number[]): number {
  let v = 0;
  for (let b = 0; b < values.length; b++) if (mask & (1 << b)) v += values[b];
  return v;
}

interface DPState {
  value: number;
  prevMask: number;
  choice: FeasibleRecipe | null;
}

/**
 * Exact dynamic program over (night, set-of-rescued-items).
 * Maximises the dollar value of at-risk food eaten before its eat-by date,
 * one dinner per night, never using an item after it expires.
 */
function optimise(nightsFeasible: FeasibleRecipe[][], values: number[]): (FeasibleRecipe | null)[] {
  const H = nightsFeasible.length;
  const layers: Map<number, DPState>[] = [new Map([[0, { value: 0, prevMask: 0, choice: null }]])];

  for (let d = 0; d < H; d++) {
    const next = new Map<number, DPState>();
    for (const [mask, state] of layers[d]) {
      const skip = next.get(mask);
      if (!skip || skip.value < state.value) next.set(mask, { value: state.value, prevMask: mask, choice: null });
      for (const fr of nightsFeasible[d]) {
        const gainMask = fr.mask & ~mask;
        if (gainMask === 0) continue;
        const newMask = mask | fr.mask;
        const value = state.value + maskValue(gainMask, values);
        const existing = next.get(newMask);
        if (!existing || existing.value < value) next.set(newMask, { value, prevMask: mask, choice: fr });
      }
    }
    layers.push(next);
  }

  let bestMask = 0;
  let bestValue = -1;
  for (const [mask, state] of layers[H]) {
    if (state.value > bestValue) {
      bestValue = state.value;
      bestMask = mask;
    }
  }

  const choices: (FeasibleRecipe | null)[] = new Array(H).fill(null);
  let mask = bestMask;
  for (let d = H; d > 0; d--) {
    const state = layers[d].get(mask)!;
    choices[d - 1] = state.choice;
    mask = state.prevMask;
  }
  return choices;
}

function simulateWaste(
  atRisk: DatedItem[],
  nightsFeasible: FeasibleRecipe[][],
  pick: (options: FeasibleRecipe[], covered: Set<string>, day: number) => FeasibleRecipe | null,
): number {
  const covered = new Set<string>();
  const used = new Set<string>();
  for (let d = 0; d < nightsFeasible.length; d++) {
    const options = nightsFeasible[d].filter((fr) => !used.has(fr.recipe.id));
    const choice = pick(options, covered, d);
    if (!choice) continue;
    used.add(choice.recipe.id);
    for (const id of choice.atRiskIds) covered.add(id);
  }
  return atRisk.filter((it) => !covered.has(it.id)).reduce((s, it) => s + it.price, 0);
}

export function buildPlan(items: InventoryItem[], recipes: Recipe[], today: string, horizon = HORIZON_NIGHTS): Plan {
  const dated = withDates(items, today);
  const alreadyExpired = dated.filter((it) => !it.staple && it.daysLeft !== null && it.daysLeft < 0);
  const atRiskAll = dated
    .filter((it) => !it.staple && it.daysLeft !== null && it.daysLeft >= 0 && it.daysLeft < horizon)
    .sort((a, b) => b.price - a.price);

  const tracked = atRiskAll.slice(0, MAX_DP_ITEMS);
  const bitOf = new Map<string, number>(tracked.map((it, i) => [it.id, i]));
  const values = tracked.map((it) => it.price);

  const nightsFeasible: FeasibleRecipe[][] = [];
  for (let d = 0; d < horizon; d++) nightsFeasible.push(feasibleOn(recipes, dated, d, bitOf));

  const choices = optimise(nightsFeasible, values);

  // Fill zero-gain nights with variety: an unused, well-grounded recipe.
  const usedRecipes = new Set(choices.filter(Boolean).map((c) => c!.recipe.id));
  for (let d = 0; d < horizon; d++) {
    if (choices[d]) continue;
    const candidates = nightsFeasible[d]
      .filter((fr) => !usedRecipes.has(fr.recipe.id))
      .sort(
        (a, b) =>
          b.grounding.usedItemIds.length - a.grounding.usedItemIds.length ||
          b.grounding.score - a.grounding.score ||
          a.recipe.popularity - b.recipe.popularity,
      );
    if (candidates[0]) {
      choices[d] = candidates[0];
      usedRecipes.add(candidates[0].recipe.id);
    }
  }

  const covered = new Set<string>();
  const nights: NightPlan[] = choices.map((choice, d) => {
    if (!choice) return { dayOffset: d, date: addDays(today, d), recipe: null, grounding: null, valueSaved: 0, rescuedItemIds: [] };
    const rescued = choice.atRiskIds.filter((id) => !covered.has(id));
    for (const id of rescued) covered.add(id);
    const valueSaved = rescued.reduce((s, id) => s + (atRiskAll.find((it) => it.id === id)?.price ?? 0), 0);
    return { dayOffset: d, date: addDays(today, d), recipe: choice.recipe, grounding: choice.grounding, valueSaved, rescuedItemIds: rescued };
  });

  const decisions: Decision[] = [];
  let savedByFreezing = 0;
  let wasted = 0;
  for (const item of atRiskAll) {
    if (covered.has(item.id)) continue;
    const entry = FOOD_BY_ID[item.foodId];
    const freezerDays = entry?.freezerDays;
    if (freezerDays && item.storage !== "freezer" && item.eatBy) {
      decisions.push({ kind: "freeze", item, freezeBy: item.eatBy, goodUntil: addDays(today, freezerDays), value: item.price });
      savedByFreezing += item.price;
    } else if (item.eatBy) {
      decisions.push({ kind: "eat-now", item, by: item.eatBy, value: item.price });
      wasted += item.price;
    }
  }
  decisions.sort((a, b) => (a.item.daysLeft ?? 0) - (b.item.daysLeft ?? 0));

  const atRiskValue = atRiskAll.reduce((s, it) => s + it.price, 0);
  const savedByCooking = atRiskAll.filter((it) => covered.has(it.id)).reduce((s, it) => s + it.price, 0);

  // Baseline 1: no plan — cook whatever people usually reach for first, deadlines ignored.
  const wastedNoPlan = simulateWaste(atRiskAll, nightsFeasible, (options) => {
    const sorted = [...options].sort((a, b) => a.recipe.popularity - b.recipe.popularity);
    return sorted[0] ?? null;
  });

  // Baseline 2: earliest-expiry-first — the greedy everyone would build.
  const daysLeftOf = new Map(atRiskAll.map((it) => [it.id, it.daysLeft ?? 99]));
  const wastedEarliestFirst = simulateWaste(atRiskAll, nightsFeasible, (options, coveredSoFar) => {
    let best: FeasibleRecipe | null = null;
    let bestKey = [Infinity, 0];
    for (const fr of options) {
      const fresh = fr.atRiskIds.filter((id) => !coveredSoFar.has(id));
      if (!fresh.length) continue;
      const soonest = Math.min(...fresh.map((id) => daysLeftOf.get(id) ?? 99));
      const key = [soonest, -fresh.length];
      if (key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) {
        bestKey = key;
        best = fr;
      }
    }
    return best ?? options[0] ?? null;
  });

  return {
    nights,
    atRisk: atRiskAll,
    atRiskValue,
    savedByCooking,
    savedByFreezing,
    wasted,
    wastedNoPlan,
    wastedEarliestFirst,
    decisions,
    alreadyExpired,
    coveredItemIds: covered,
  };
}
