"use client";

import { useMemo, useState } from "react";
import { CATEGORY_LABELS, FOODKEEPER, FOOD_BY_ID } from "@/lib/foodkeeper";
import { matchFood } from "@/lib/normalize";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
  onPick: (itemId: string, foodId: string) => void;
}

export function ConfirmDialog({ item, onClose, onPick }: Props) {
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    if (!item) return [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return FOODKEEPER.filter((f) => f.name.toLowerCase().includes(q) || f.aliases.some((a) => a.includes(q)))
        .slice(0, 8)
        .map((f) => ({ foodId: f.id, score: null as number | null }));
    }
    const { candidates } = matchFood(item.rawLine.replace(/\$?\d+\.\d{2}.*$/, ""));
    return candidates.map((c) => ({ foodId: c.foodId, score: c.score as number | null }));
  }, [item, query]);

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What is this?</DialogTitle>
          <DialogDescription>
            The receipt says <span className="font-mono text-foreground">{item?.rawLine.replace(/\s{2,}/g, " ")}</span>. We guessed{" "}
            <span className="text-foreground">{item?.displayName}</span> at {item ? Math.round(item.confidence * 100) : 0}% confidence.
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Search FoodKeeper…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {candidates.map((c) => {
            const f = FOOD_BY_ID[c.foodId];
            const current = item?.foodId === c.foodId;
            return (
              <li key={c.foodId}>
                <button
                  type="button"
                  onClick={() => item && onPick(item.id, c.foodId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    current && "border-primary/50 bg-primary/10",
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {f.emoji}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{f.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{CATEGORY_LABELS[f.category]}</span>
                  </span>
                  {c.score !== null && <span className="text-xs tabular-nums text-muted-foreground">{Math.round(c.score * 100)}%</span>}
                </button>
              </li>
            );
          })}
          {!candidates.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing matches — try another word.</li>}
        </ul>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => item && onPick(item.id, item.foodId)} disabled={!item || !FOOD_BY_ID[item.foodId]}>
            Guess was right
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
