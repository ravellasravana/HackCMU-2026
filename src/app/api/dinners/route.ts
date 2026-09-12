import { EMPTY_DIET, filterRecipesByDiet } from "@/lib/diet";
import { FOOD_BY_ID, KITCHEN_STAPLES } from "@/lib/foodkeeper";
import { llmConfigured, llmJson, type LlmProvider } from "@/lib/llm";
import { dinnersPrompt, type DinnerPromptItem } from "@/lib/prompts";
import { GROUNDING_THRESHOLD, groundRecipe, withDates } from "@/lib/scheduler";
import type { DietPrefs, InventoryItem, Recipe } from "@/lib/types";

interface K2Dinners {
  dinners: {
    id: string;
    title: string;
    emoji: string;
    minutes: number;
    servings: number;
    ingredients: { foodId: string; key?: boolean; optional?: boolean }[];
    staples: string[];
    steps: string[];
  }[];
}

function toRecipe(d: K2Dinners["dinners"][number], index: number, provider: LlmProvider): Recipe | null {
  const ingredients = (d.ingredients ?? [])
    .filter((i) => i && typeof i.foodId === "string" && FOOD_BY_ID[i.foodId])
    .map((i) => ({ foodId: i.foodId, key: Boolean(i.key), optional: Boolean(i.optional) }));
  if (!ingredients.length || !d.title) return null;
  const staples = (d.staples ?? []).filter((s) => KITCHEN_STAPLES.includes(s));
  return {
    id: `${provider}-${(d.id || d.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    title: d.title,
    emoji: d.emoji && [...d.emoji].length <= 2 ? d.emoji : "🍽️",
    minutes: Number(d.minutes) || 25,
    servings: Number(d.servings) || 2,
    ingredients,
    staples,
    steps: (d.steps ?? []).slice(0, 5),
    popularity: 50 + index,
    source: provider,
  };
}

/**
 * POST { items: InventoryItem[], today } → { recipes, rejected, source }
 * Asks IFM K2 or Gemini (whichever is configured) for three dinners, then verifies each
 * one against the actual inventory. Dinners under the grounding threshold are rejected;
 * one regeneration pass includes the reasons.
 */
export async function POST(request: Request) {
  let items: InventoryItem[] = [];
  let today = "";
  let diet: DietPrefs = EMPTY_DIET;
  try {
    const body = (await request.json()) as { items?: InventoryItem[]; today?: string; diet?: DietPrefs };
    items = body.items ?? [];
    today = body.today ?? "";
    diet = body.diet ?? EMPTY_DIET;
  } catch {
    return Response.json({ error: "Body must be JSON with `items` and `today`." }, { status: 400 });
  }
  if (!llmConfigured()) {
    return Response.json({
      recipes: [],
      rejected: [],
      source: "local",
      note: "Tonight's plan is already picked from the recipe library. Add a Gemini or IFM K2 key to unlock fresh AI-generated dinners too.",
    });
  }
  if (!items.length || !today) return Response.json({ error: "Nothing in the kitchen yet." }, { status: 400 });

  const dated = withDates(items, today);
  const promptItems: DinnerPromptItem[] = dated
    .filter((i) => !i.staple)
    .map((i) => ({ name: i.displayName, foodId: i.foodId, daysLeft: i.daysLeft, price: i.price }));

  const accepted: Recipe[] = [];
  const rejected: { title: string; reason: string }[] = [];
  let feedback: string | undefined;
  let usedProvider: LlmProvider = "k2";

  try {
    for (let attempt = 0; attempt < 2 && accepted.length < 3; attempt++) {
      const { data: out, provider } = await llmJson<K2Dinners>(dinnersPrompt(promptItems, feedback, diet), { maxTokens: 8000 });
      usedProvider = provider;
      const reasons: string[] = [];
      (out.dinners ?? []).forEach((d, i) => {
        const recipe = toRecipe(d, attempt * 10 + i, provider);
        if (!recipe) {
          reasons.push(`"${d?.title ?? "untitled"}" had no valid inventory ingredients`);
          return;
        }
        if (!filterRecipesByDiet([recipe], diet).length) {
          reasons.push(`"${recipe.title}" broke a diet rule and was dropped`);
          return;
        }
        const grounding = groundRecipe(recipe, dated, 0);
        if (grounding.passes) {
          accepted.push(recipe);
        } else {
          const why = grounding.missing.length
            ? `missing ${grounding.missing.join(", ")}`
            : `only ${(grounding.score * 100).toFixed(0)}% of ingredients are in the kitchen (need ${GROUNDING_THRESHOLD * 100}%)`;
          rejected.push({ title: recipe.title, reason: why });
          reasons.push(`"${recipe.title}" — ${why}`);
        }
      });
      feedback = reasons.join("; ") || undefined;
    }
    return Response.json({ recipes: accepted.slice(0, 3), rejected, source: usedProvider });
  } catch (err) {
    return Response.json({ recipes: accepted, rejected, source: "local", note: `LLM unavailable: ${(err as Error).message}` });
  }
}
