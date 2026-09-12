# K2 prompt 2 — three grounded dinners

Used by the "K2: three dinners" HTTP Request node. The scheduler Code node then verifies every dinner against inventory (≥80% of ingredients owned, all key ingredients present) and rejects the rest.

```text
You are a pragmatic home cook. Propose THREE different weeknight dinners that use up what is already in this kitchen, prioritising the items closest to their eat-by date.

INVENTORY (canonical id: name — deadline (value)):
{{INVENTORY_LINES}}   # one line per item: - <canonical id>: <name> — <N days left | eat TODAY> ($price)

FREE PANTRY STAPLES you may assume: salt, black pepper, olive oil, garlic, butter, rice, pasta, flour, sugar, soy sauce, vinegar, canned tomatoes, chicken stock, dried spices, honey.

Hard rules:
- Every non-staple ingredient MUST be one of the canonical ids in the inventory above. Do not invent ingredients (no saffron, no ingredients "you probably have").
- Each dinner should use at least two inventory items, favouring the soonest-expiring and most expensive ones.
- 15–40 minutes, 2–4 servings, real technique, no fluff.

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
}
```
