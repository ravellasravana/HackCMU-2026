// n8n Code node — "Build K2 extraction request"
// Mode: Run Once for Each Item
// Input: { receiptText } from "Prepare receipt text". Output: { body } for the HTTP Request node.

const PROMPT = "You read grocery receipts and order-confirmation emails from any retailer (Instacart, Amazon Fresh, Walmart, DoorDash, Kroger, Target, Whole Foods) and turn them into structured data.\n\nReceipt lines are cryptic and abbreviated, e.g. \"ORG BBY SPNCH 5OZ\" = organic baby spinach, \"CHKN BRST BNLS 1.2LB\" = boneless chicken breast, \"GV WHL MLK GAL\" = Great Value whole milk. Expand them.\n\nFor every purchased FOOD item, output one object. Skip fees, tips, tax, totals, delivery notes, bags, and non-food items.\n\nMap each item to ONE canonical id from this USDA FoodKeeper list, or null if nothing fits:\nspinach (produce), lettuce (produce), kale (produce), strawberries (produce), blueberries (produce), raspberries (produce), grapes (produce), bananas (produce), apples (produce), avocados (produce), tomatoes (produce), cucumbers (produce), bell_pepper (produce), broccoli (produce), carrots (produce), onions (produce), garlic (produce), potatoes (produce), sweet_potatoes (produce), mushrooms (produce), zucchini (produce), asparagus (produce), green_beans (produce), lemons (produce), limes (produce), cilantro (produce), basil (produce), ginger (produce), corn (produce), celery (produce), cauliflower (produce), mango (produce), oranges (produce), cabbage (produce), salad_kit (produce), milk (dairy), oat_milk (dairy), eggs (eggs), butter (dairy), cheddar (dairy), mozzarella (dairy), parmesan (dairy), yogurt (dairy), cream_cheese (dairy), sour_cream (dairy), heavy_cream (dairy), chicken_breast (meat), chicken_thighs (meat), ground_beef (meat), steak (meat), pork_chops (meat), bacon (meat), sausage (meat), deli_turkey (deli), salmon (seafood), shrimp (seafood), tofu (deli), bread (bakery), tortillas (bakery), bagels (bakery), hummus (deli), salsa (deli), guacamole (deli), fresh_pasta (deli), orange_juice (beverage), frozen_peas (frozen), frozen_berries (frozen), ice_cream (frozen), frozen_pizza (frozen), rice (pantry), pasta (pantry), olive_oil (pantry), canned_beans (pantry), canned_tomatoes (pantry), oats (pantry), flour (pantry), sugar (pantry), peanut_butter (pantry), cereal (pantry), coffee (pantry), chips (pantry), soy_sauce (pantry), stock (pantry), spices (pantry), quinoa (pantry), honey (pantry), coconut_milk (pantry), sparkling_water (beverage)\n\nReturn ONLY JSON matching:\n{\n  \"retailer\": string | null,\n  \"purchase_date\": \"YYYY-MM-DD\" | null,\n  \"items\": [\n    {\n      \"raw_line\": string,          // the exact receipt line\n      \"name\": string,              // human-readable expansion, e.g. \"Organic baby spinach\"\n      \"canonical\": string | null,  // FoodKeeper id from the list above\n      \"category\": \"produce\" | \"dairy\" | \"eggs\" | \"meat\" | \"seafood\" | \"bakery\" | \"deli\" | \"beverage\" | \"frozen\" | \"pantry\",\n      \"quantity\": number,\n      \"unit\": string | null,       // \"lb\", \"oz\", \"ct\", \"gal\", ...\n      \"price\": number,             // line total in dollars, 0 if unknown\n      \"confidence\": number         // 0..1 — how sure you are about the canonical mapping\n    }\n  ]\n}\n\nBe honest about confidence: below 0.7 means a human should confirm the mapping.\n\nRECEIPT:\n\"\"\"\n{{RECEIPT_TEXT}}\n\"\"\"";

const text = $input.item.json.receiptText || '';
return {
  json: {
    body: {
      model: $env.K2_MODEL || 'kimi-k2-0905-preview',
      temperature: 0.2,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You return strictly valid JSON and nothing else.' },
        { role: 'user', content: PROMPT.replace('{{RECEIPT_TEXT}}', text) },
      ],
    },
  },
};
