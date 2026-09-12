"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus, CalendarCheck2, Mail, RotateCcw, Sparkles, Loader2, TrainFront,
} from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";
import { RECEIPT_PRESETS } from "@/lib/demo";
import * as googleCalendar from "@/lib/google-calendar";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FridgeTimeline } from "@/components/fridge-timeline";
import { Headline } from "@/components/headline";
import { PlanPanel } from "@/components/plan-panel";
import { ReceiptDialog, type ExtractResult } from "@/components/receipt-dialog";

/**
 * The very first thing anyone sees: a single, unavoidable "input food"
 * prompt. There's exactly one way past it — add something (voice/text, via
 * AddItem) or paste a whole receipt — plus the dialog's own close button for
 * anyone who wants to look at the (empty) app first. Either way, closing it
 * reveals the same main page underneath.
 */
function WelcomeDialog({
  open,
  onOpenChange,
  onAdd,
  onOpenReceipt,
  onDemo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (text: string) => string | null;
  onOpenReceipt: () => void;
  onDemo: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">Input food</DialogTitle>
          <DialogDescription>Type what you bought, or paste a whole receipt below.</DialogDescription>
        </DialogHeader>

        <AddItem onAdd={onAdd} autoFocus />

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" size="lg" onClick={onOpenReceipt} className="w-full">
          <Mail /> Paste a whole receipt
        </Button>

        <button
          type="button"
          onClick={onDemo}
          className="text-center text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          or just try a demo
        </button>
      </DialogContent>
    </Dialog>
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
  // Always shown on open, regardless of what's already in the fridge — the
  // dashboard sits as the backdrop behind it either way (see hasItems below).
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [confirming, setConfirming] = useState<InventoryItem | null>(null);
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
      `${items.length} items loaded${result.source === "k2" ? " by IFM K2" : " (local normalizer)"}` +
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
        body: JSON.stringify({ items: state.items, today }),
      });
      const data = (await res.json()) as {
        recipes?: Recipe[];
        rejected?: { title: string; reason: string }[];
        source: string;
        note?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "K2 request failed");
      if (data.recipes?.length) {
        setState((s) => ({ ...s, k2Recipes: data.recipes! }));
        const rejectedNote = data.rejected?.length
          ? ` Rejected ${data.rejected.length} ungrounded: ${data.rejected.map((r) => `${r.title} (${r.reason})`).join("; ")}.`
          : "";
        setNotice({
          text: `IFM K2 proposed ${data.recipes.length} dinners that passed the grounding check.${rejectedNote}`,
          kind: "info",
        });
      } else {
        setNotice({ text: data.note ?? "K2 returned nothing usable — using the built-in recipe library.", kind: "warn" });
      }
    } catch (err) {
      setNotice({ text: (err as Error).message, kind: "warn" });
    } finally {
      setK2Busy(false);
    }
  }

  function reset() {
    setState(EMPTY_STATE);
    setNotice(null);
  }

  const hasItems = state.items.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      {/* ---- Top bar ---- */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/15">
              <TrainFront className="size-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold leading-none tracking-tight">Dining Car</div>
              <div className="text-[10px] text-muted-foreground">IFM K2 · USDA FoodKeeper · HackCMU 2026</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" onClick={() => setReceiptOpen(true)}>
              <Mail /> Paste receipt
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
                  title="Ask IFM K2 for personalized dinners — verified against your inventory"
                >
                  {k2Busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {k2Busy ? "Thinking…" : "K2 dinners"}
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

      {/* ---- Main content — always the same page; the welcome dialog above handles first-run ---- */}
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        {hasItems && <Headline plan={plan} retailer={state.retailer} />}

        <div className={hasItems ? "grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]" : "mx-auto w-full max-w-xl"}>
          {/* Left: timeline */}
          <section className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Fridge timeline</h2>
                {hasItems && (
                  <Badge variant="secondary" className="font-normal">
                    {perishableCount} items
                  </Badge>
                )}
                {state.lastSource && (
                  <Badge variant="outline" className="font-normal text-primary">
                    {state.lastSource === "k2" ? "read by IFM K2" : "read locally"}
                  </Badge>
                )}
                {unconfirmed > 0 && (
                  <Badge variant="outline" className="border-amber-400/40 font-normal text-amber-200">
                    {unconfirmed} to confirm
                  </Badge>
                )}
              </div>
              {hasItems && (
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-400 inline-block" />4+ days</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400 inline-block" />2–3 days</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-rose-400 inline-block" />eat now</span>
                  <span>🍴 planned</span>
                </div>
              )}
            </div>

            <AddItem onAdd={handleAdd} />

            {hasItems ? (
              <FridgeTimeline
                items={dated}
                plan={plan}
                today={today}
                onStorageChange={(id, storage: Storage) => updateItem(id, { storage })}
                onConfirm={(item) => setConfirming(item)}
                onRemove={(id) => setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }))}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-muted-foreground">
                Your fridge is empty — add something above, or{" "}
                <button type="button" onClick={() => setReceiptOpen(true)} className="text-primary underline decoration-dotted underline-offset-2">
                  paste a receipt
                </button>
                .
              </div>
            )}

            {hasItems && (
              <p className="px-1 text-[11px] text-muted-foreground">
                Toggle where each item lives (counter / fridge / freezer) and the deadline changes live. Shelf lives from USDA FoodKeeper.
              </p>
            )}
          </section>

          {/* Right: plan */}
          {hasItems && (
            <aside className="space-y-0 min-w-0">
              <PlanPanel plan={plan} items={dated} today={today} />
            </aside>
          )}
        </div>
      </main>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/8 px-4 py-3 text-center text-[11px] text-muted-foreground md:px-8">
        IFM K2-Horizon-375B reads receipts · USDA FoodKeeper sets the clocks · exact DP maximises dollars eaten before expiry · every recipe verified against your inventory
        <span className="mx-2">·</span>
        <span className="font-medium text-foreground">HackCMU 2026 · Food Track</span>
      </footer>

      {/* ---- Dialogs ---- */}
      <WelcomeDialog
        open={welcomeOpen}
        onOpenChange={setWelcomeOpen}
        onAdd={(text) => {
          const err = handleAdd(text);
          if (!err) setWelcomeOpen(false);
          return err;
        }}
        onOpenReceipt={() => {
          setWelcomeOpen(false);
          setReceiptOpen(true);
        }}
        onDemo={() => {
          setWelcomeOpen(false);
          loadDemo();
        }}
      />
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
