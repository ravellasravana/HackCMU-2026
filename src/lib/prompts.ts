import { FOODKEEPER, KITCHEN_STAPLES } from "./foodkeeper";
import type { DietPrefs } from "./types";

/** K2 prompt #1 — receipt → normalized items with confidence. Also shipped in n8n/prompts. */
export function extractionPrompt(receiptText: string): string {
  const canon = FOODKEEPER.map((f) => `${f.id} (${f.category})`).join(", ");
  return `You read grocery receipts and order-confirmation emails from any retailer (Instacart, Amazon Fresh, Walmart, DoorDash, Kroger, Target, Whole Foods) and turn them into structured data.

Receipt lines are cryptic and abbreviated, e.g. "ORG BBY SPNCH 5OZ" = organic baby spinach, "CHKN BRST BNLS 1.2LB" = boneless chicken breast, "GV WHL MLK GAL" = Great Value whole milk. Expand them.

For every purchased FOOD item, output one object. Skip fees, tips, tax, totals, delivery notes, bags, and non-food items.

Map each item to ONE canonical id from this USDA FoodKeeper list, or null if nothing fits:
${canon}

Return ONLY JSON matching:
{
  "retailer": string | null,
  "purchase_date": "YYYY-MM-DD" | null,
  "items": [
    {
      "raw_line": string,          // the exact receipt line
      "name": string,              // human-readable expansion, e.g. "Organic baby spinach"
      "canonical": string | null,  // FoodKeeper id from the list above
      "category": "produce" | "dairy" | "eggs" | "meat" | "seafood" | "bakery" | "deli" | "beverage" | "frozen" | "pantry",
      "quantity": number,
      "unit": string | null,       // "lb", "oz", "ct", "gal", ...
      "price": number,             // line total in dollars, 0 if unknown
      "confidence": number         // 0..1 — how sure you are about the canonical mapping
    }
  ]
}

Be honest about confidence: below 0.7 means a human should confirm the mapping.

RECEIPT:
"""
${receiptText}
"""`;
}

/** Gemini vision prompt — a fridge/counter/leftovers photo → items with a visually-judged shelf life. */
export function photoScanPrompt(): string {
  const canon = FOODKEEPER.map((f) => `${f.id} (${f.category})`).join(", ");
  return `You look at a photo of food (a fridge, a counter, a container of leftovers, meal-prepped food) and report what you actually see, not what a label would claim.

For each distinct food item or dish visible, judge its condition directly from the image: color, wilting, browning, mold, liquid separation, packaging state. This is real people's food safety, so be conservative — if something looks questionable, say so and estimate fewer days, not more.

If an item matches one of these canonical USDA FoodKeeper foods, use its id, otherwise set canonical to null and describe it (this covers home-cooked or mixed dishes, like "chicken and rice meal prep", that no grocery item id can represent):
${canon}

Return ONLY JSON matching:
{
  "items": [
    {
      "name": string,                  // human-readable, e.g. "Leftover chicken and rice" or "Bag of spinach"
      "canonical": string | null,      // FoodKeeper id above, or null for a dish/meal not on the list
      "category": "produce" | "dairy" | "eggs" | "meat" | "seafood" | "bakery" | "deli" | "beverage" | "frozen" | "pantry",
      "condition": string,             // one short phrase on what you actually observed, e.g. "fresh, no browning" or "wilted edges, use soon"
      "estimated_days_left": number,   // your best judgment from the photo alone, 0 if it should be eaten today or looks questionable, be conservative
      "confidence": number             // 0..1 — how sure you are this is what the item actually is
    }
  ]
}

Only include items you can actually see with reasonable confidence. Do not invent items that are not visible.`;
}

export interface DinnerPromptItem {
  name: string;
  foodId: string;
  daysLeft: number | null;
  price: number;
}

function dietRules(diet?: DietPrefs): string {
  if (!diet) return "";
  const lines: string[] = [];
  if (diet.vegetarian) lines.push("- Vegetarian only: no meat and no seafood ingredients, in any dinner.");
  if (diet.allergies.length) lines.push(`- Allergies, must not appear anywhere: ${diet.allergies.join(", ")}.`);
  return lines.length ? `\n${lines.join("\n")}` : "";
}

/** K2 prompt #2 — three dinners constrained to what is actually in the kitchen. */
export function dinnersPrompt(items: DinnerPromptItem[], rejectedFeedback?: string, diet?: DietPrefs): string {
  const inventory = items
    .map((i) => `- ${i.foodId}: ${i.name} — ${i.daysLeft === null ? "no deadline" : i.daysLeft <= 0 ? "eat TODAY" : `${i.daysLeft} days left`} ($${i.price.toFixed(2)})`)
    .join("\n");
  return `You are a pragmatic home cook. Propose THREE different weeknight dinners that use up what is already in this kitchen, prioritising the items closest to their eat-by date.

INVENTORY (canonical id: name — deadline (value)):
${inventory}

FREE PANTRY STAPLES you may assume: ${KITCHEN_STAPLES.join(", ")}.

Hard rules:
- Every non-staple ingredient MUST be one of the canonical ids in the inventory above. Do not invent ingredients (no saffron, no ingredients "you probably have").
- Each dinner should use at least two inventory items, favouring the soonest-expiring and most expensive ones.
- 15–40 minutes, 2–4 servings, real technique, no fluff.${dietRules(diet)}
${rejectedFeedback ? `\nYour previous answer was rejected by the grounding checker: ${rejectedFeedback}\nFix it.\n` : ""}
Return ONLY JSON:
{
  "dinners": [
    {
      "id": string,                       // kebab-case slug
      "title": string,
      "emoji": string,                    // one emoji
      "minutes": number,
      "servings": number,
      "ingredients": [ { "foodId": string, "key": boolean, "optional": boolean } ],
      "staples": string[],                // subset of the free staples list
      "steps": string[]                   // 2–4 terse steps
    }
  ]
}`;
}
