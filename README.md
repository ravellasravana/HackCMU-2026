# 🚂 Dining Car

> **"Forward your grocery receipt. We put eat-by alarms on your calendar and tell you what to cook tonight so nothing rots."**

---

**HackCMU 2026 · Food Track · IFM Prize submission**

Built with **IFM K2-Horizon-375B-A23B** · USDA FoodKeeper shelf-life data · exact dynamic-programming scheduler

---

## The problem

US households throw out **~$1,800 in groceries every year** — not because they're careless, but because they forget what's in the fridge. Every food app asks you to type in what you bought or photograph your fridge. **Nobody was reading the receipt already in your inbox.**

## What it does

1. **Forward the receipt** (Instacart / Walmart / Amazon Fresh / DoorDash / any retailer)  
2. **IFM K2** extracts every item with a confidence score, maps each one to a canonical food using the USDA FoodKeeper database, and flags anything uncertain for a one-tap confirm  
3. **USDA FoodKeeper** assigns pantry / fridge / freezer shelf lives to every item; toggle where it lives and the deadline changes live  
4. **A value-maximising scheduler** (exact DP over nights × set of rescued items) picks one dinner per night for 7 nights that keeps the **most dollars of food from expiring** — not just "earliest-expiry first", which leaves money on the table  
5. **The app** shows a fridge timeline (green → amber → red), tonight's dinner card with a grounding score ("Uses 8 of 8 ingredients you own"), freeze-or-eat decisions, and a before/after headline: *Without a plan: $35.59 goes in the bin. With Dining Car: $0.00.*

## Demo in 3 minutes

| When | What happens |
|------|-------------|
| 0:00 | "Who has thrown out spinach they forgot about?" → forward the Instacart receipt → nodes light up |
| 0:40 | Fridge timeline appears: 🥬 Spinach 4 days · 🍓 Strawberries 2 days · 🐔 Chicken 1 day |
| 1:00 | Tonight: **Spinach-strawberry salad with grilled chicken** · rescues $16.87 · Uses 8/8 ingredients |
| 1:30 | Calendar: eat-by alarms and nightly dinner events already filled in |
| 2:00 | Hand judge the keyboard: type "avocados" → timeline updates instantly |
| 2:30 | "Freeze the ground beef by Sunday and it's good until January." |

## What's technically interesting

| Layer | Detail |
|-------|--------|
| **Receipt parsing** | Token-by-token abbreviation expansion (`ORG BBY SPNCH 5OZ` → `Organic baby spinach`) + bigram similarity match against FoodKeeper aliases. Confidence score 0–1; below 0.7 → amber "confirm?" chip. |
| **Shelf-life engine** | ~75 USDA FoodKeeper entries with pantry / fridge / freezer days + opened-package rules. Storage toggle changes the clock in real time. |
| **Dollar-optimising DP** | One dinner per night, never use an item past eat-by, maximise total dollars eaten. O(2^N × nights) where N ≤ 16 tracked items; runs in ~2 ms. Also computes "no plan" and "earliest-first" baselines for the headline comparison. |
| **Freeze-or-eat decisions** | Anything the plan can't fit checks FoodKeeper for a freezer life: "Freeze by Sunday → good until January." Items with no freezer life become eat-now alerts. |
| **Grounded recipe checker** | Every recipe (library or K2-generated) is scored: owned ÷ total (staples count as owned). Below 80% or a missing key ingredient → rejected. Score shown on card: *"Uses 8 of 8 ingredients you own."* K2 regenerates once with the rejection reasons included in the prompt. |
| **IFM K2-Horizon-375B** | Two calls: (1) receipt → structured items with canonical food IDs + confidence; (2) three dinners constrained to what you actually own. Fully grounded by the checker — the model can't hallucinate a dinner needing saffron. |

## Run locally

```bash
git clone https://github.com/ravellasravana/HackCMU-2026.git
cd HackCMU-2026
npm install
cp .env.example .env.local   # fill in your IFM key
npm run dev
# → http://localhost:4187
```

**Everything works offline** (local receipt normalizer + built-in recipe library). The IFM K2 calls kick in when `K2_API_KEY` is set.

```env
# .env.local
K2_API_KEY=IFM-v1_...
K2_BASE_URL=https://api.ifm.ai/v1
K2_MODEL=IFM/K2-Horizon-375B-A23B
```

## Tech stack

- **Next.js 16** (App Router, TypeScript) · **Tailwind CSS 4** · **shadcn/ui**  
- **IFM K2-Horizon-375B-A23B** via `api.ifm.ai`  
- **USDA FoodKeeper** shelf-life data (abridged, embedded)  
- **localStorage** only — zero backend, zero database, fully static-deployable  
- Exact dynamic-programming scheduler (vanilla TypeScript, ~120 lines)

## Tracks

**Food** (primary) · **IFM Prize** (K2 model used for both receipt extraction and recipe generation)

---

*Built at HackCMU 2026 by the Dining Car team.*
