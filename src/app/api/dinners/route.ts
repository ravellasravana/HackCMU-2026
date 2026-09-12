import { FOOD_BY_ID, KITCHEN_STAPLES } from "@/lib/foodkeeper";
import { k2Configured, k2Json } from "@/lib/k2";
import { dinnersPrompt, type DinnerPromptItem } from "@/lib/prompts";
import { GROUNDING_THRESHOLD, groundRecipe, withDates } from "@/lib/scheduler";
import type { InventoryItem, Recipe } from "@/lib/types";

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

function toRecipe(d: K2Dinners["dinners"][number], index: number): Recipe | null {
  const ingredients = (d.ingredients ?? [])
    .filter((i) => i && typeof i.foodId === "string" && FOOD_BY_ID[i.foodId])
    .map((i) => ({ foodId: i.foodId, key: Boolean(i.key), optional: Boolean(i.optional) }));
  if (!ingredients.length || !d.title) return null;
  const staples = (d.staples ?? []).filter((s) => KITCHEN_STAPLES.includes(s));
  return {
    id: `k2-${(d.id || d.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    title: d.title,
    emoji: d.emoji && [...d.emoji].length <= 2 ? d.emoji : "🍽️",
    minutes: Number(d.minutes) || 25,
    servings: Number(d.servings) || 2,
    ingredients,
    staples,
    steps: (d.steps ?? []).slice(0, 5),
    popularity: 50 + index,
    source: "k2",
  };
}

/**
 * POST { items: InventoryItem[], today } → { recipes, rejected, source }
 * Asks K2 for three dinners, then verifies each one against the actual inventory.
 * Dinners under the grounding threshold are rejected; one regeneration pass includes the reasons.
 */
export async function POST(request: Request) {
  let items: InventoryItem[] = [];
  let today = "";
  try {
    const body = (await request.json()) as { items?: InventoryItem[]; today?: string };
    items = body.items ?? [];
    today = body.today ?? "";
  } catch {
    return Response.json({ error: "Body must be JSON with `items` and `today`." }, { status: 400 });
  }
  if (!k2Configured()) {
    return Response.json({ recipes: [], rejected: [], source: "local", note: "K2_API_KEY not set — using the built-in recipe library." });
  }
  if (!items.length || !today) return Response.json({ error: "Nothing in the kitchen yet." }, { status: 400 });

  const dated = withDates(items, today);
  const promptItems: DinnerPromptItem[] = dated
    .filter((i) => !i.staple)
    .map((i) => ({ name: i.displayName, foodId: i.foodId, daysLeft: i.daysLeft, price: i.price }));

  const accepted: Recipe[] = [];
  const rejected: { title: string; reason: string }[] = [];
  let feedback: string | undefined;

  try {
    for (let attempt = 0; attempt < 2 && accepted.length < 3; attempt++) {
      const out = await k2Json<K2Dinners>(dinnersPrompt(promptItems, feedback));
      const reasons: string[] = [];
      (out.dinners ?? []).forEach((d, i) => {
        const recipe = toRecipe(d, attempt * 10 + i);
        if (!recipe) {
          reasons.push(`"${d?.title ?? "untitled"}" had no valid inventory ingredients`);
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
    return Response.json({ recipes: accepted.slice(0, 3), rejected, source: "k2" });
  } catch (err) {
    return Response.json({ recipes: accepted, rejected, source: "local", note: `K2 unavailable: ${(err as Error).message}` });
  }
}
