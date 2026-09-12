import { describe, expect, it } from "vitest";
import { addDays, todayISO } from "./dates";
import { registerFood } from "./foodkeeper";
import { buildPlan, HORIZON_NIGHTS } from "./scheduler";
import type { InventoryItem, Recipe } from "./types";

const TODAY = "2024-01-01";

function makeItem(overrides: Partial<InventoryItem> & { foodId: string; price: number }): InventoryItem {
  return {
    id: overrides.foodId,
    rawLine: overrides.foodId,
    displayName: overrides.foodId,
    emoji: "🍽️",
    category: "produce",
    quantity: 1,
    purchaseDate: TODAY,
    storage: "fridge",
    opened: false,
    confidence: 1,
    confirmed: true,
    staple: false,
    source: "manual",
    ...overrides,
  };
}

function makeRecipe(overrides: Partial<Recipe> & { id: string; ingredients: Recipe["ingredients"] }): Recipe {
  return {
    title: overrides.id,
    emoji: "🍽️",
    minutes: 20,
    servings: 2,
    staples: [],
    steps: ["cook"],
    popularity: 1,
    source: "library",
    ...overrides,
  };
}

describe("buildPlan", () => {
  it("returns an empty, non-crashing plan for an empty kitchen", () => {
    const plan = buildPlan([], [], TODAY);
    expect(plan.nights).toHaveLength(HORIZON_NIGHTS);
    expect(plan.nights.every((n) => n.recipe === null)).toBe(true);
    expect(plan.atRisk).toHaveLength(0);
    expect(plan.atRiskValue).toBe(0);
    expect(plan.savedByCooking).toBe(0);
    expect(plan.savedByFreezing).toBe(0);
    expect(plan.wasted).toBe(0);
    expect(plan.wastedNoPlan).toBe(0);
    expect(plan.wastedEarliestFirst).toBe(0);
    expect(plan.decisions).toHaveLength(0);
  });

  it("picks the higher-value item over the cheaper one when both expire tonight and only one dinner can rescue either", () => {
    registerFood({ id: "test-cheap", name: "Test cheap", emoji: "🥬", category: "produce", aliases: ["test-cheap"], fridgeDays: 1, defaultStorage: "fridge" });
    registerFood({ id: "test-pricey", name: "Test pricey", emoji: "🥩", category: "meat", aliases: ["test-pricey"], fridgeDays: 1, defaultStorage: "fridge" });

    // Both bought yesterday with a 1-day fridge life: both expire at end of "today", so
    // daysLeft is 0 for both and neither is available on any later night.
    const items = [
      makeItem({ foodId: "test-cheap", price: 2, purchaseDate: addDays(TODAY, -1) }),
      makeItem({ foodId: "test-pricey", price: 10, purchaseDate: addDays(TODAY, -1) }),
    ];
    const recipes = [
      makeRecipe({ id: "cheap-dinner", ingredients: [{ foodId: "test-cheap", key: true }] }),
      makeRecipe({ id: "pricey-dinner", ingredients: [{ foodId: "test-pricey", key: true }] }),
    ];

    const plan = buildPlan(items, recipes, TODAY);

    // Only one dinner can be cooked tonight, and both candidates are grounded (100%),
    // so an exact dollar-maximizer must take the $10 item, not whichever sorts first.
    expect(plan.nights[0].recipe?.id).toBe("pricey-dinner");
    expect(plan.savedByCooking).toBe(10);
    expect(plan.wasted).toBe(2);
    expect(plan.decisions.some((d) => d.kind === "eat-now" && d.item.foodId === "test-cheap")).toBe(true);
  });

  it("puts an item with no feasible recipe into a freeze-or-eat decision instead of crashing", () => {
    registerFood({ id: "test-giant", name: "Test giant", emoji: "🦃", category: "meat", aliases: ["test-giant"], fridgeDays: 2, freezerDays: 200, defaultStorage: "fridge" });

    const items = [makeItem({ foodId: "test-giant", price: 42, purchaseDate: TODAY })];
    const plan = buildPlan(items, [], TODAY);

    expect(plan.nights.every((n) => n.recipe === null)).toBe(true);
    expect(plan.atRiskValue).toBe(42);
    expect(plan.savedByCooking).toBe(0);
    expect(plan.decisions).toHaveLength(1);
    expect(plan.decisions[0]).toMatchObject({ kind: "freeze", value: 42 });
    expect(plan.savedByFreezing).toBe(42);
    expect(plan.wasted).toBe(0);
  });

  it("never lets the DP plan waste more than the earliest-expiry-first baseline", () => {
    const today = todayISO();
    registerFood({ id: "test-a", name: "Test A", emoji: "🥬", category: "produce", aliases: ["test-a"], fridgeDays: 1, defaultStorage: "fridge" });
    registerFood({ id: "test-b", name: "Test B", emoji: "🥩", category: "meat", aliases: ["test-b"], fridgeDays: 3, defaultStorage: "fridge" });

    const items = [
      makeItem({ foodId: "test-a", price: 3, purchaseDate: today }),
      makeItem({ foodId: "test-b", price: 15, purchaseDate: today }),
    ];
    const recipes = [makeRecipe({ id: "combo-dinner", ingredients: [{ foodId: "test-a", key: true }, { foodId: "test-b", key: true }] })];

    const plan = buildPlan(items, recipes, today);
    expect(plan.wasted).toBeLessThanOrEqual(plan.wastedEarliestFirst);
  });
});
