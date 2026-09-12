# K2 prompt 1 — receipt → items with confidence

Used by the "K2: extract items" HTTP Request node. Replace `{{RECEIPT_TEXT}}` with the plain-text email body.

```text
You read grocery receipts and order-confirmation emails from any retailer (Instacart, Amazon Fresh, Walmart, DoorDash, Kroger, Target, Whole Foods) and turn them into structured data.

Receipt lines are cryptic and abbreviated, e.g. "ORG BBY SPNCH 5OZ" = organic baby spinach, "CHKN BRST BNLS 1.2LB" = boneless chicken breast, "GV WHL MLK GAL" = Great Value whole milk. Expand them.

For every purchased FOOD item, output one object. Skip fees, tips, tax, totals, delivery notes, bags, and non-food items.

Map each item to ONE canonical id from this USDA FoodKeeper list, or null if nothing fits:
spinach (produce), lettuce (produce), kale (produce), strawberries (produce), blueberries (produce), raspberries (produce), grapes (produce), bananas (produce), apples (produce), avocados (produce), tomatoes (produce), cucumbers (produce), bell_pepper (produce), broccoli (produce), carrots (produce), onions (produce), garlic (produce), potatoes (produce), sweet_potatoes (produce), mushrooms (produce), zucchini (produce), asparagus (produce), green_beans (produce), lemons (produce), limes (produce), cilantro (produce), basil (produce), ginger (produce), corn (produce), celery (produce), cauliflower (produce), mango (produce), oranges (produce), cabbage (produce), salad_kit (produce), milk (dairy), oat_milk (dairy), eggs (eggs), butter (dairy), cheddar (dairy), mozzarella (dairy), parmesan (dairy), yogurt (dairy), cream_cheese (dairy), sour_cream (dairy), heavy_cream (dairy), chicken_breast (meat), chicken_thighs (meat), ground_beef (meat), steak (meat), pork_chops (meat), bacon (meat), sausage (meat), deli_turkey (deli), salmon (seafood), shrimp (seafood), tofu (deli), bread (bakery), tortillas (bakery), bagels (bakery), hummus (deli), salsa (deli), guacamole (deli), fresh_pasta (deli), orange_juice (beverage), frozen_peas (frozen), frozen_berries (frozen), ice_cream (frozen), frozen_pizza (frozen), rice (pantry), pasta (pantry), olive_oil (pantry), canned_beans (pantry), canned_tomatoes (pantry), oats (pantry), flour (pantry), sugar (pantry), peanut_butter (pantry), cereal (pantry), coffee (pantry), chips (pantry), soy_sauce (pantry), stock (pantry), spices (pantry), quinoa (pantry), honey (pantry), coconut_milk (pantry), sparkling_water (beverage)

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
{{RECEIPT_TEXT}}
"""
```
