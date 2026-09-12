"use client";

import { useState } from "react";
import { Loader2, ScanLine, Mail } from "lucide-react";
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
  source: "k2" | "gemini" | "local";
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
            Paste the order confirmation from Instacart, Amazon Fresh, Walmart, DoorDash — any retailer. Even cryptic register lines work.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Load a sample:</span>
          {RECEIPT_PRESETS.map((p) => (
            <Button key={p.id} variant="outline" size="xs" onClick={() => loadPreset(p.id)} title={p.description}>
              {p.label}
            </Button>
          ))}
        </div>

        {/* Textarea + scan overlay */}
        <div className="relative">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"1 × Organic Baby Spinach, 5 oz    $3.49\n1 × Strawberries, 1 lb            $4.99\nCHKN BRST BNLS 1.2LB              008.39 F\n..."}
            className="max-h-[45vh] min-h-52 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/90 backdrop-blur-sm">
              <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-card px-6 py-4 text-center">
                {/* Scan line */}
                <div className="scan-line pointer-events-none absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
                <ScanLine className="mx-auto mb-2 size-8 text-primary animate-pulse" />
                <p className="text-sm font-medium">
                  AI is reading your receipt…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Extracting items → matching FoodKeeper shelf lives
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Items map to USDA FoodKeeper shelf lives. Low-confidence lines get a confirm tap.
          </p>
          <Button onClick={extract} disabled={busy || !text.trim()} size="lg">
            {busy ? (
              <>
                <Loader2 className="animate-spin" /> Reading…
              </>
            ) : (
              <>
                <ScanLine /> Set the clocks
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
