"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { addDays, todayISO } from "@/lib/dates";
import { RECEIPT_PRESETS } from "@/lib/demo";
import type { ReceiptMeta } from "@/lib/normalize";
import type { ExtractedLine } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ExtractResult {
  lines: ExtractedLine[];
  meta: ReceiptMeta;
  source: "k2" | "local";
  warning?: string;
  fallbackDate: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExtracted: (result: ExtractResult) => void;
}

export function ReceiptDialog({ open, onOpenChange, onExtracted }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackDate, setFallbackDate] = useState(todayISO());

  function loadPreset(id: string) {
    const preset = RECEIPT_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const iso = addDays(todayISO(), -preset.daysAgo);
    setFallbackDate(iso);
    setText(preset.build(iso));
    setError(null);
  }

  async function extract() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Extraction failed (${res.status})`);
      if (!data.lines?.length) throw new Error("No food items found. Paste the part of the email that lists what you bought.");
      onExtracted({ ...data, fallbackDate });
      setText("");
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="size-4" /> Forward a grocery receipt
          </DialogTitle>
          <DialogDescription>
            Paste the order email from Instacart, Amazon Fresh, Walmart, DoorDash — any retailer. Cryptic register lines are fine.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Try a sample:</span>
          {RECEIPT_PRESETS.map((p) => (
            <Button key={p.id} variant="outline" size="xs" onClick={() => loadPreset(p.id)} title={p.description}>
              {p.label}
            </Button>
          ))}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"1 × Organic Baby Spinach, 5 oz    $3.49\n1 × Strawberries, 1 lb            $4.99\nCHKN BRST BNLS 1.2LB              008.39 F"}
          className="max-h-[50vh] min-h-56 font-mono text-xs leading-relaxed"
          spellCheck={false}
        />

        {error && <p className="rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>}

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground">Items are mapped to USDA FoodKeeper shelf lives. Uncertain lines get a confirm tap.</p>
          <Button onClick={extract} disabled={busy || !text.trim()}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" /> Reading receipt…
              </>
            ) : (
              "Set the clocks"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
