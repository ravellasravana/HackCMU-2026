"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Mail, RotateCcw, Sparkles, Loader2, TrainFront } from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";
import { RECEIPT_PRESETS } from "@/lib/demo";
import { buildCalendar } from "@/lib/ics";
import { lineToItem, manualItem, reassignFood } from "@/lib/inventory";
import { parseReceipt } from "@/lib/normalize";
import { RECIPES } from "@/lib/recipes";
import { buildPlan, withDates, type DatedItem } from "@/lib/scheduler";
import { EMPTY_STATE, loadPersisted, savePersisted, type Persisted } from "@/lib/store";
import type { InventoryItem, Recipe, Storage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddItem } from "@/components/add-item";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FridgeTimeline } from "@/components/fridge-timeline";
import { Headline } from "@/components/headline";
import { PlanPanel } from "@/components/plan-panel";
import { ReceiptDialog, type ExtractResult } from "@/components/receipt-dialog";

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
  const [k2Busy, setK2Busy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Midnight rollover: the clocks tick over without a reload.
    const tick = window.setInterval(() => setToday(todayISO()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  const recipes = useMemo(() => [...state.k2Recipes, ...RECIPES], [state.k2Recipes]);
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
    setNotice(
      `${items.length} items read${result.source === "k2" ? " by K2" : ""}${flagged ? `, ${flagged} need a confirm tap` : ""}.` +
        (result.warning ? ` ${result.warning}` : ""),
    );
  }

  function loadDemo() {
    const preset = RECEIPT_PRESETS[0];
    const iso = addDays(today, -preset.daysAgo);
    const { lines, meta } = parseReceipt(preset.build(iso));
    handleExtracted({ lines, meta, source: "local", fallbackDate: iso });
  }

  function handleAdd(text: string): string | null {
    const item = manualItem(text);
    if (!item) return "Couldn't read that — try something like “avocados” or “1 lb shrimp $8.99”.";
    setState((s) => ({ ...s, items: [...s.items, item] }));
    return null;
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

  async function askK2() {
    setK2Busy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/dinners", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: state.items, today }),
      });
      const data = (await res.json()) as { recipes?: Recipe[]; rejected?: { title: string; reason: string }[]; source: string; note?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "K2 request failed");
      if (data.recipes?.length) {
        setState((s) => ({ ...s, k2Recipes: data.recipes! }));
        const rejectedNote = data.rejected?.length ? ` Rejected ${data.rejected.length} ungrounded: ${data.rejected.map((r) => `${r.title} (${r.reason})`).join("; ")}.` : "";
        setNotice(`K2 proposed ${data.recipes.length} dinners that passed the grounding check.${rejectedNote}`);
      } else {
        setNotice(data.note ?? "K2 returned nothing usable; the built-in library is still in play.");
      }
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setK2Busy(false);
    }
  }

  function reset() {
    setState(EMPTY_STATE);
    setNotice(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <TrainFront className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.25em]">Dining Car</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Nothing in your fridge rots on your watch.</h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Forward your grocery receipt. We put eat-by alarms on your calendar and tell you what to cook tonight — ordered by how much money dies first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setReceiptOpen(true)}>
            <Mail /> Forward a receipt
          </Button>
          <Button variant="outline" onClick={downloadCalendar} disabled={!perishableCount} title="One eat-by alarm per perishable plus each night's dinner">
            <CalendarPlus /> Calendar (.ics)
          </Button>
          <Button variant="outline" onClick={askK2} disabled={!perishableCount || k2Busy} title="Ask Kimi K2 for three dinners, verified against your inventory">
            {k2Busy ? <Loader2 className="animate-spin" /> : <Sparkles />} K2 dinners
          </Button>
          {state.items.length > 0 && (
            <Button variant="ghost" onClick={reset} aria-label="Clear everything">
              <RotateCcw /> Reset
            </Button>
          )}
        </div>
      </header>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {state.items.length === 0 ? (
        <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-dashed px-6 py-16 text-center">
          <div className="text-6xl" aria-hidden>
            🧾 → 📅 → 🍽️
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-xl font-semibold">Your fridge timeline is empty</h2>
            <p className="text-sm text-muted-foreground">
              Paste an order email from Instacart, Amazon Fresh, Walmart or DoorDash. Every item gets a shelf life from the USDA FoodKeeper table and a
              spot in a value-maximising dinner plan.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" onClick={loadDemo}>
              Use Thursday&apos;s Instacart receipt
            </Button>
            <Button size="lg" variant="outline" onClick={() => setReceiptOpen(true)}>
              Paste my own
            </Button>
          </div>
        </section>
      ) : (
        <>
          <Headline plan={plan} retailer={state.retailer} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Fridge timeline · {perishableCount} perishables
                  {state.lastSource && (
                    <Badge variant="secondary" className="ml-2 font-normal">
                      parsed {state.lastSource === "k2" ? "by K2" : "locally"}
                    </Badge>
                  )}
                  {unconfirmed > 0 && (
                    <Badge variant="outline" className="ml-2 border-amber-400/40 font-normal text-amber-200">
                      {unconfirmed} to confirm
                    </Badge>
                  )}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-emerald-400" /> 4+ days
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-amber-400" /> 2–3 days
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <i className="size-2 rounded-full bg-rose-400" /> eat now
                  </span>
                  <span className="inline-flex items-center gap-1">🍴 planned</span>
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
              />
              <p className="px-1 text-[11px] text-muted-foreground">
                Toggle where each item lives — counter, fridge, freezer — and the clocks change. Shelf lives from USDA FoodKeeper; opened-package rules apply where the data has them.
              </p>
            </section>

            <aside>
              <PlanPanel plan={plan} items={dated} today={today} />
            </aside>
          </div>
        </>
      )}

      <footer className="mt-auto border-t pt-4 text-xs text-muted-foreground">
        K2 reads the receipt · USDA FoodKeeper sets the clocks · an exact dynamic program picks one dinner a night to maximise dollars eaten before they expire ·
        every dinner is verified against what you actually own.
      </footer>

      <ReceiptDialog open={receiptOpen} onOpenChange={setReceiptOpen} onExtracted={handleExtracted} />
      <ConfirmDialog
        item={confirming}
        onClose={() => setConfirming(null)}
        onPick={(itemId, foodId) => {
          updateItem(itemId, (it) => reassignFood(it, foodId));
          setConfirming(null);
        }}
      />
    </div>
  );
}
