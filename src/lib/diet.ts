import { FOOD_BY_ID } from "./foodkeeper";
import type { DietPrefs, Recipe } from "./types";

const MEAT_SEAFOOD = new Set(["meat", "seafood"]);

export function recipeIsVegetarian(recipe: Recipe): boolean {
  return recipe.ingredients.every((ing) => {
    const category = FOOD_BY_ID[ing.foodId]?.category;
    return !category || !MEAT_SEAFOOD.has(category);
  });
}

function textMentionsAllergen(text: string, allergen: string): boolean {
  return text.toLowerCase().includes(allergen);
}

export function recipeViolatesAllergies(recipe: Recipe, allergies: string[]): boolean {
  if (!allergies.length) return false;
  const foodTexts = recipe.ingredients.flatMap((ing) => {
    const entry = FOOD_BY_ID[ing.foodId];
    return entry ? [entry.name, ...entry.aliases] : [];
  });
  const haystacks = [...foodTexts, ...recipe.staples, recipe.title];
  return allergies.some((allergen) => {
    const a = allergen.trim().toLowerCase();
    return a.length > 0 && haystacks.some((text) => textMentionsAllergen(text, a));
  });
}

/** Applied to both the library and any K2-generated recipes before they ever reach the scheduler. */
export function filterRecipesByDiet(recipes: Recipe[], diet: DietPrefs): Recipe[] {
  return recipes.filter((r) => {
    if (diet.vegetarian && !recipeIsVegetarian(r)) return false;
    if (recipeViolatesAllergies(r, diet.allergies)) return false;
    return true;
  });
}

export function parseAllergies(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const EMPTY_DIET: DietPrefs = { vegetarian: false, allergies: [] };
