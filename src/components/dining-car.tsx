"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus, CalendarCheck2, Mail, RotateCcw, Sparkles, Loader2, TrainFront,
  CalendarPlus, Camera, Leaf, Mail, RotateCcw, Sparkles, Loader2,
  TrendingDown, Zap, ChevronRight,
} from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";
import { RECEIPT_PRESETS } from "@/lib/demo";
import * as googleCalendar from "@/lib/google-calendar";
import { filterRecipesByDiet } from "@/lib/diet";
import { buildCalendar } from "@/lib/ics";
import { lineToItem, manualItem, reassignFood, scannedItemToInventoryItem } from "@/lib/inventory";
import { parseReceipt } from "@/lib/normalize";
import { RECIPES } from "@/lib/recipes";
import { buildPlan, withDates, type DatedItem } from "@/lib/scheduler";
import { EMPTY_STATE, loadPersisted, savePersisted, type Persisted } from "@/lib/store";
import type { DietPrefs, FoodEntry, InventoryItem, Recipe, ScannedItem, Storage } from "@/lib/types";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddItem } from "@/components/add-item";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DietDialog } from "@/components/diet-dialog";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { FridgeTimeline } from "@/components/fridge-timeline";
import { Headline } from "@/components/headline";
import { PlanPanel } from "@/components/plan-panel";
import { ReceiptDialog, type ExtractResult } from "@/components/receipt-dialog";
import { ScanDialog } from "@/components/scan-dialog";

function providerLabel(source: "k2" | "gemini" | "local"): string {
  if (source === "k2") return "IFM K2";
  if (source === "gemini") return "Gemini";
  return "the local normalizer";
}

/* ---- tiny floating food particles for the empty state hero ---- */
const PARTICLES = ["🥬", "🍓", "🐔", "🥛", "🐟", "🥑", "🍌", "🥩"];

function FoodParticle({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div className="pointer-events-none absolute select-none text-2xl opacity-20 animate-star" style={style}>
      {emoji}
    </div>
  );
}

function EmptyHero({ onDemo, onOpen }: { onDemo: () => void; onOpen: () => void }) {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      {/* Background particles */}
      {PARTICLES.map((emoji, i) => (
        <FoodParticle
          key={i}
          emoji={emoji}
          style={{
            top: `${15 + i * 9}%`,
            left: `${8 + ((i * 37) % 84)}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${3 + (i % 3)}s`,
          }}
        />
      ))}

      {/* Card */}
      <div className="relative z-10 w-full max-w-xl space-y-6 animate-float-in">
        {/* Emoji stack */}
        <div className="flex justify-center gap-1 text-5xl">
          {["🧾", "→", "📅", "→", "🍽️"].map((c, i) => (
            <span key={i} className={`animate-slide-up delay-${i * 100}`} style={{ animationDelay: `${i * 100}ms` }}>
              {c}
            </span>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
            Stop throwing{" "}
            <span className="text-rose-400">money</span>{" "}
            in the bin.
          </h2>
          <p className="mx-auto max-w-md text-base text-muted-foreground md:text-lg">
            Forward your grocery receipt. We read it with AI, set eat-by alarms on every item, and build a dinner plan that keeps as much money in your belly as possible.
          </p>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap justify-center gap-4 py-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
            <TrendingDown className="size-4 text-primary" />
            <div className="text-left">
              <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                ${Math.round(useAnimatedNumber(1800, 1600)).toLocaleString()}
              </div>
              <div className="max-w-[14rem] text-[11px] leading-tight text-muted-foreground">Average annual food waste per US household</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
            <Zap className="size-4 text-primary" />
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">AI-powered</div>
              <div className="max-w-[14rem] text-[11px] leading-tight text-muted-foreground">Every dinner grounded in what you actually own</div>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="animate-glow-pulse gap-2 text-base font-semibold"
            onClick={onDemo}
          >
            <span>🛒</span> Load Thursday&apos;s Instacart receipt
            <ChevronRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={onOpen}>
            <Mail className="size-4" /> Paste my own receipt
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          No account, no database, no tracking — everything stays in your browser.
          <br />
          Powered by <span className="font-medium text-foreground">AI</span> · USDA FoodKeeper shelf lives
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */

export function DiningCar() {
  const [state, setStateRaw] = useState<Persisted>(loadPersisted);
  const setState = useCallback((updater: Persisted | ((prev: Persisted) => Persisted)) => {
    setStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      savePersisted(next);
      return next;
    });
  }, []);

  const [today, setToday] = useState(() => todayISO());
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirming, setConfirming] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [dietOpen, setDietOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [k2Busy, setK2Busy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; kind: "info" | "warn" } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    setGoogleConnected(googleCalendar.isConnected());
    const handle = googleCalendar.registerRedirectListener((ok, message) => {
      setGoogleBusy(false);
      if (ok) {
        setGoogleConnected(true);
        setNotice({ text: "Connected to Google Calendar. Syncing your plan now…", kind: "info" });
        void handleSyncGoogle();
      } else {
        setNotice({ text: message ?? "Google sign-in didn't complete.", kind: "warn" });
      }
    });
    return () => {
      void handle.then((h) => h.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recipes = useMemo(() => [...state.k2Recipes, ...RECIPES], [state.k2Recipes]);
  const recipes = useMemo(
    () => filterRecipesByDiet([...state.k2Recipes, ...RECIPES], state.diet),
    [state.k2Recipes, state.diet],
  );
  const dated: DatedItem[] = useMemo(() => withDates(state.items, today), [state.items, today]);
  const plan = useMemo(() => buildPlan(state.items, recipes, today), [state.items, recipes, today]);

  const perishableCount = dated.filter((i) => !i.staple).length;
  const unconfirmed = dated.filter((i) => !i.confirmed && i.confidence < 0.7).length;

  function updateItem(id: string, patch: Partial<InventoryItem> | ((it: InventoryItem) => InventoryItem)) {
    setState((s) => ({
      ...s,
      items: s.items.map((it) => (it.id === id ? (typeof patch === "function" ? patch(it) : { ...it, ...patch }) : it)),
    }));
  }

  function handleExtracted(result: ExtractResult) {
    const purchaseDate = result.meta.purchaseDate ?? result.fallbackDate;
    const items = result.lines.map((l) => lineToItem(l, purchaseDate, "receipt"));
    setState((s) => ({
      ...s,
      items: [...s.items, ...items],
      retailer: result.meta.retailer ?? s.retailer,
      lastSource: result.source,
    }));
    const flagged = items.filter((i) => !i.confirmed).length;
    const msg =
      `${items.length} items loaded by ${providerLabel(result.source)}` +
      (flagged ? ` · ${flagged} low-confidence ${flagged === 1 ? "line" : "lines"} — tap the amber chip to confirm` : ".") +
      (result.warning ? ` ⚠️ ${result.warning}` : "");
    setNotice({ text: msg, kind: flagged > 0 ? "warn" : "info" });
  }

  function loadDemo() {
    const preset = RECEIPT_PRESETS[0];
    const iso = addDays(today, -preset.daysAgo);
    const { lines, meta } = parseReceipt(preset.build(iso));
    handleExtracted({ lines, meta, source: "local", fallbackDate: iso });
  }

  function handleAdd(text: string): string | null {
    const item = manualItem(text);
    if (!item) return "Couldn't read that — try something like \"avocados\" or \"1 lb shrimp $8.99\".";
    setState((s) => ({ ...s, items: [...s.items, item] }));
    return null;
  }

  function handleScanned(items: ScannedItem[]) {
    const newItems = items.map((i) => scannedItemToInventoryItem(i, today));
    setState((s) => ({ ...s, items: [...s.items, ...newItems] }));
    setNotice({ text: `${newItems.length} item${newItems.length === 1 ? "" : "s"} added from your photo, shelf life read straight from what the camera saw.`, kind: "info" });
  }

  function downloadCalendar() {
    const ics = buildCalendar(dated, plan, today);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dining-car-eat-by.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGoogleCalendar() {
    if (!googleConnected) {
      setGoogleBusy(true);
      try {
        await googleCalendar.connect();
      } catch (err) {
        setGoogleBusy(false);
        setNotice({ text: (err as Error).message, kind: "warn" });
      }
      return;
    }
    await handleSyncGoogle();
  }

  async function handleSyncGoogle() {
    setGoogleBusy(true);
    try {
      const result = await googleCalendar.syncToGoogleCalendar(dated, plan);
      const failedNote = result.failed ? `, ${result.failed} failed${result.firstError ? ` (${result.firstError})` : ""}` : "";
      setNotice({
        text: `Synced to Google Calendar: ${result.created} added, ${result.updated} updated${failedNote}.`,
        kind: result.failed ? "warn" : "info",
      });
    } catch (err) {
      setNotice({ text: (err as Error).message, kind: "warn" });
    } finally {
      setGoogleBusy(false);
    }
  }

  async function askK2() {
    setK2Busy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/dinners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: state.items, today, diet: state.diet }),
      });
      const data = (await res.json()) as {
        recipes?: Recipe[];
        rejected?: { title: string; reason: string }[];
        source: "k2" | "gemini" | "local";
        note?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "LLM request failed");
      if (data.recipes?.length) {
        setState((s) => ({ ...s, k2Recipes: data.recipes! }));
        const rejectedNote = data.rejected?.length
          ? ` Rejected ${data.rejected.length} ungrounded: ${data.rejected.map((r) => `${r.title} (${r.reason})`).join("; ")}.`
          : "";
        setNotice({
          text: `${providerLabel(data.source)} proposed ${data.recipes.length} dinners that passed the grounding check.${rejectedNote}`,
          kind: "info",
        });
      } else {
        setNotice({ text: data.note ?? "Couldn't find a new AI dinner that fits your kitchen — tonight's plan is still from the recipe library.", kind: "warn" });
      }
    } catch (err) {
      setNotice({ text: (err as Error).message, kind: "warn" });
    } finally {
      setK2Busy(false);
    }
  }

  function reset() {
    const rescuedThisWeek = plan.savedByCooking + plan.savedByFreezing;
    setState((s) => ({
      ...EMPTY_STATE,
      customFoods: s.customFoods,
      diet: s.diet,
      lifetimeSaved: s.lifetimeSaved + rescuedThisWeek,
    }));
    setNotice(null);
  }

  const hasItems = state.items.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="text-sm font-bold leading-none tracking-tight">Dining Car</div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" onClick={() => setReceiptOpen(true)}>
              <Mail /> Paste receipt
            </Button>
            <Button size="sm" variant="outline" onClick={() => setScanOpen(true)} title="Scan a fridge or leftovers photo with AI">
              <Camera /> Scan fridge
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDietOpen(true)}
              title="Vegetarian / allergy preferences"
              className={state.diet.vegetarian || state.diet.allergies.length ? "border-emerald-400/40 text-emerald-200" : undefined}
            >
              <Leaf /> Diet
            </Button>
            {hasItems && (
              <>
                <Button size="sm" variant="outline" onClick={downloadCalendar} title="Download eat-by alarms + dinner events as a .ics file">
                  <CalendarPlus /> .ics
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGoogleCalendar}
                  disabled={googleBusy}
                  title={googleConnected ? "Push eat-by alarms + dinner events to your Google Calendar" : "Connect your Google Calendar"}
                >
                  {googleBusy ? <Loader2 className="animate-spin" /> : <CalendarCheck2 />}
                  {googleBusy ? "Working…" : googleConnected ? "Sync Calendar" : "Connect Calendar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={askK2}
                  disabled={k2Busy}
                  title="Ask AI for fresh dinner ideas — every one verified against your inventory"
                >
                  {k2Busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {k2Busy ? "Thinking…" : "AI dinners"}
                </Button>
                <Button size="sm" variant="ghost" onClick={reset} aria-label="Clear everything">
                  <RotateCcw />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---- Notice bar ---- */}
      {notice && (
        <div
          className={`border-b px-4 py-2 text-xs md:px-8 ${
            notice.kind === "warn"
              ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
              : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        </div>
      )}

      {/* ---- Main content ---- */}
      {!hasItems ? (
        <EmptyHero onDemo={loadDemo} onOpen={() => setReceiptOpen(true)} />
      ) : (
        <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          <Headline plan={plan} retailer={state.retailer} lifetimeSaved={state.lifetimeSaved} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
            {/* Left: timeline */}
            <section className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">
                    Fridge timeline
                  </h2>
                  <Badge variant="secondary" className="font-normal">
                    {perishableCount} items
                  </Badge>
                  {state.lastSource && (
                    <Badge variant="outline" className="font-normal text-primary">
                      read {state.lastSource === "local" ? "locally" : `by ${providerLabel(state.lastSource)}`}
                    </Badge>
                  )}
                  {unconfirmed > 0 && (
                    <Badge variant="outline" className="border-amber-400/40 font-normal text-amber-200">
                      {unconfirmed} to confirm
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 inline-block" />4+ days</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 inline-block" />2–3 days</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400 inline-block" />eat now</span>
                  <span>🍴 planned</span>
                </div>
              </div>

              <AddItem onAdd={handleAdd} />

              <FridgeTimeline
                items={dated}
                plan={plan}
                today={today}
                onStorageChange={(id, storage: Storage) => updateItem(id, { storage })}
                onConfirm={(item) => setConfirming(item)}
                onRemove={(id) => setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }))}
                onEdit={(item) => setEditing(item)}
              />

              <p className="px-1 text-[11px] text-muted-foreground">
                Toggle where each item lives (counter / fridge / freezer) and the deadline changes live. Shelf lives from USDA FoodKeeper.
              </p>
            </section>

            {/* Right: plan */}
            <aside className="space-y-0 min-w-0">
              <PlanPanel plan={plan} items={dated} today={today} />
            </aside>
          </div>
        </main>
      )}

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/8 px-4 py-3 text-center text-[11px] text-muted-foreground md:px-8">
        AI reads receipts · USDA FoodKeeper sets the clocks · exact DP maximises dollars eaten before expiry · every recipe verified against your inventory
        <span className="mx-2">·</span>
        <span className="font-medium text-foreground">HackCMU 2026 · Food Track</span>
      </footer>

      {/* ---- Dialogs ---- */}
      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} onExtracted={handleExtracted} />
      <ConfirmDialog
        item={confirming}
        onClose={() => setConfirming(null)}
        onPick={(itemId, foodId) => {
          updateItem(itemId, (it) => reassignFood(it, foodId));
          setConfirming(null);
        }}
        onCreateFood={(itemId, entry: FoodEntry) => {
          setState((s) => ({ ...s, customFoods: [...s.customFoods, entry] }));
          updateItem(itemId, (it) => reassignFood(it, entry.id));
          setConfirming(null);
        }}
      />
      <EditItemDialog item={editing} onClose={() => setEditing(null)} onSave={(id, patch) => updateItem(id, patch)} />
      <DietDialog
        open={dietOpen}
        onOpenChange={setDietOpen}
        diet={state.diet}
        onSave={(diet: DietPrefs) => setState((s) => ({ ...s, diet }))}
      />
      <ScanDialog open={scanOpen} onOpenChange={setScanOpen} onAdd={handleScanned} />
    </div>
  );
}
