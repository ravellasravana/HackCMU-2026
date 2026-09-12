# Dining Car

> Forward your grocery receipt. We put *eat-by* alarms on your calendar and tell you what to cook tonight so nothing rots.

Dining Car reads the order email that Instacart, Amazon Fresh, Walmart or DoorDash already sent you, maps every line to a USDA FoodKeeper shelf life, and then solves a small optimisation problem: **which dinner on which night so the most money's worth of food gets eaten before it expires.** The result is a fridge timeline, a "Tonight: …" card, a calendar full of eat-by alarms, and a one-line headline judges understand instantly:

> Without a plan: **$35.59** of this receipt goes in the bin. With Dining Car: **$0.00**.

This repo contains two things:

1. **The web app** (`src/`) — the fridge-timeline UI, the receipt normalizer, the scheduler, and API routes that call Kimi K2 when a key is present (and fall back to fully local logic when it isn't).
2. **The n8n workflow** (`n8n/`) — Gmail trigger → K2 extraction → shelf-life lookup → K2 dinners → dollar-optimising scheduler → Google Calendar alarms + summary email. Same algorithms, shipped as Code nodes.

## Run it locally

```bash
npm install
npm run dev
# → http://localhost:4187
```

Click **Use Thursday's Instacart receipt** for the demo flow, or **Forward a receipt** and paste any order email. Everything works offline; state lives in `localStorage`.

### Optional: Kimi K2

Without a key, receipts are parsed by a deterministic normalizer (abbreviation expansion + fuzzy match against FoodKeeper aliases) and dinners come from a built-in 26-recipe library. With a key, K2 handles both, and every K2 dinner is still verified against your inventory before it's allowed on the plan.

```bash
# .env.local
K2_API_KEY=sk-...
K2_BASE_URL=https://api.moonshot.ai/v1          # or https://openrouter.ai/api/v1
K2_MODEL=kimi-k2-0905-preview                    # or moonshotai/kimi-k2-0905 on OpenRouter
```

## What's underneath

| Piece | Where | What it does |
| --- | --- | --- |
| Receipt normalization with confidence | `src/lib/normalize.ts` | `ORG BBY SPNCH 5OZ` → *baby spinach*, 1.00. Whole-phrase alias hits score by how much of the line they explain; otherwise bigram similarity. Anything under 0.7 gets an amber **Confirm?** tap. |
| Shelf-life data | `src/lib/foodkeeper.ts` | ~75 foods from USDA FoodKeeper with pantry / fridge / freezer days and opened-package rules, plus per-category fallbacks. Toggle where an item lives and the clock changes. |
| Dollar-optimising scheduler | `src/lib/scheduler.ts` | Exact dynamic program over (night, set-of-rescued-items). One dinner per night, never use an item after its eat-by, maximise dollars eaten before expiry. Runs in ~2 ms. Also computes the "no plan" and "earliest-expiry-first" baselines for the before/after headline. |
| Freeze-or-eat decisions | `src/lib/scheduler.ts` | Anything the plan can't fit before it dies becomes *"Freeze the ground beef by Sunday and it's good until January."* Items that don't freeze become an honest "eat it as a snack or it's $X in the bin." |
| Grounded recipes with a checker | `src/lib/scheduler.ts` → `groundRecipe` | Every dinner (library or K2) is scored: owned ingredients ÷ total, staples count as owned. Under 80 % or missing a key ingredient → rejected. The card shows *"Uses 6 of 7 ingredients you own."* |
| Calendar export | `src/lib/ics.ts` | One all-day eat-by alarm per perishable, one "Tonight: …" event per night, one "Freeze the …" reminder per decision. |
| K2 prompts | `src/lib/prompts.ts`, `n8n/prompts/` | Prompt 1: receipt → items with canonical FoodKeeper id + confidence. Prompt 2: three dinners constrained to inventory. |

## The n8n workflow

Import `n8n/dining-car-workflow.json`, then attach credentials to the Gmail, Google Calendar and "K2 API key" (HTTP header auth, `Authorization: Bearer …`) nodes. Set `K2_BASE_URL` / `K2_MODEL` as n8n environment variables if you're not on Moonshot's default endpoint.

```
Gmail Trigger  subject:(receipt OR "your order" OR Instacart OR "Amazon Fresh" OR Walmart OR DoorDash)
  → Prepare receipt text          (Code)  strip HTML
  → Build K2 extraction request   (Code)  prompt 1
  → K2: extract items             (HTTP)
  → Parse K2 JSON                 (Code)
  → Shelf life & eat-by dates     (Code)  FoodKeeper table, eat-by per item
  → Build K2 dinners request      (Code)  prompt 2
  → K2: three dinners             (HTTP)
  → Parse K2 dinners              (Code)
  → Dollar-optimising scheduler   (Code)  grounding check + DP + freeze decisions + email/calendar rows
      → One row per calendar event → Google Calendar   (eat-by alarms, dinners, freeze reminders)
      → Gmail: weekly summary                          ("11 items expire this week — tonight: …")
```

The Code node sources are in `n8n/code/` so they can be read and diffed; `n8n/mock-instacart-receipt.eml` is the email to forward during the demo.

## Demo script (3 minutes)

1. "Who here has thrown out vegetables they forgot about?" Forward the Instacart receipt; nodes light up.
2. Open the calendar: 🐔 Chicken eat by Sun, 🍓 Strawberries eat by Mon, 🥬 Spinach eat by Wed. "I typed nothing."
3. Open the app: fridge timeline, green → amber → red. **Tonight: spinach-strawberry salad with grilled chicken** — the three things dying first, $16.87 rescued.
4. Hand over the mouse: "Add something you bought this week." Type *avocados*. Timeline updates, the plan reshuffles.
5. Point at the decision: "Freeze the ground beef by Sunday and it's good until January."
6. One line on what's underneath: K2 reads the receipt, USDA shelf-life data sets the clocks, an exact DP orders meals by what dies first, and every dinner is verified against what you actually own.

## Roadmap (don't build)

A weekly "what did you actually throw out?" tap that learns your waste pattern and edits your next shopping list, and a shared household mode where roommates' receipts merge.
