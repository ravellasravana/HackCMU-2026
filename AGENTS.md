# Dining Car

Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui. Standard Next.js conventions
apply, nothing exotic. `npm run dev` serves on port 4187 (see package.json), not 3000.

## Architecture

- Zero backend, zero database. All state (`InventoryItem[]`, K2-generated recipes) lives in
  `localStorage` via [src/lib/store.ts](src/lib/store.ts). The app shell is loaded with
  `ssr: false` ([src/components/dining-car-loader.tsx](src/components/dining-car-loader.tsx))
  because it reads `localStorage` on mount.
- The only server code is two API routes ([src/app/api/extract](src/app/api/extract/route.ts),
  [src/app/api/dinners](src/app/api/dinners/route.ts)) that call the IFM K2 model
  ([src/lib/k2.ts](src/lib/k2.ts), marked `server-only`). Both fall back to a deterministic
  local path when `K2_API_KEY` is unset or the call fails, so the app runs fully offline.
- Core logic is plain TypeScript in `src/lib/`, not React: `foodkeeper.ts` (USDA shelf-life
  table), `normalize.ts` (receipt line parsing), `scheduler.ts` (the dollar-maximizing DP and
  the recipe grounding check), `ics.ts` (calendar export). Read these before changing behavior;
  most bugs are logic bugs here, not UI bugs.
- K2 output is never trusted directly: `foodId`s are validated against `FOOD_BY_ID` and
  recipes are re-checked with `groundRecipe` before they reach the UI.

## Conventions

- `@/` resolves to `src/`.
- Path aliases and strict mode are set in [tsconfig.json](tsconfig.json); do not loosen them.
- New shadcn primitives go in `src/components/ui/`; feature components stay flat in
  `src/components/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
