// n8n Code node — "Build K2 dinners request"
// Mode: Run Once for All Items
// Input: output of "Shelf life & eat-by dates". Output: same payload plus { body } for the HTTP Request node.

const PROMPT = "You are a pragmatic home cook. Propose THREE different weeknight dinners that use up what is already in this kitchen, prioritising the items closest to their eat-by date.\n\nINVENTORY (canonical id: name — deadline (value)):\n{{INVENTORY_LINES}}\n\nFREE PANTRY STAPLES you may assume: salt, black pepper, olive oil, garlic, butter, rice, pasta, flour, sugar, soy sauce, vinegar, canned tomatoes, chicken stock, dried spices, honey.\n\nHard rules:\n- Every non-staple ingredient MUST be one of the canonical ids in the inventory above. Do not invent ingredients (no saffron, no ingredients \"you probably have\").\n- Each dinner should use at least two inventory items, favouring the soonest-expiring and most expensive ones.\n- 15–40 minutes, 2–4 servings, real technique, no fluff.\n\nReturn ONLY JSON:\n{\n  \"dinners\": [\n    {\n      \"id\": string,                       // kebab-case slug\n      \"title\": string,\n      \"emoji\": string,                    // one emoji\n      \"minutes\": number,\n      \"servings\": number,\n      \"ingredients\": [ { \"foodId\": string, \"key\": boolean, \"optional\": boolean } ],\n      \"staples\": string[],                // subset of the free staples list\n      \"steps\": string[]                   // 2–4 terse steps\n    }\n  ]\n}";

const data = $input.first().json;
const lines = data.items
  .filter((it) => !it.staple && it.canonical !== 'unknown')
  .sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99))
  .map((it) => `- ${it.canonical}: ${it.name} — ${it.daysLeft == null ? 'no deadline' : it.daysLeft <= 0 ? 'eat TODAY' : it.daysLeft + ' days left'} ($${it.price.toFixed(2)})`)
  .join('\n');

return [{
  json: {
    ...data,
    body: {
      model: $env.K2_MODEL || 'kimi-k2-0905-preview',
      temperature: 0.4,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You return strictly valid JSON and nothing else.' },
        { role: 'user', content: PROMPT.replace('{{INVENTORY_LINES}}', lines) },
      ],
    },
  },
}];
