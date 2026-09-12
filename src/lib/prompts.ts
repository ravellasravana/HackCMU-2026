import { FOODKEEPER, KITCHEN_STAPLES } from "./foodkeeper";

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

export interface DinnerPromptItem {
  name: string;
  foodId: string;
  daysLeft: number | null;
  price: number;
}

/** K2 prompt #2 — three dinners constrained to what is actually in the kitchen. */
export function dinnersPrompt(items: DinnerPromptItem[], rejectedFeedback?: string): string {
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
- 15–40 minutes, 2–4 servings, real technique, no fluff.
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
