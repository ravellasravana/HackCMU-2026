"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { CATEGORY_DEFAULTS, CATEGORY_LABELS, customFoodId, FOODKEEPER, FOOD_BY_ID, registerFood } from "@/lib/foodkeeper";
import { matchFood } from "@/lib/normalize";
import type { Category, FoodEntry, InventoryItem, Storage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
  onPick: (itemId: string, foodId: string) => void;
  /** Nothing in FoodKeeper matches — register a new food and point the item at it. */
  onCreateFood: (itemId: string, entry: FoodEntry) => void;
}

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as Category[];
const STORAGE_OPTIONS: { value: Storage; label: string }[] = [
  { value: "pantry", label: "Counter / pantry" },
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
];

export function ConfirmDialog({ item, onClose, onPick, onCreateFood }: Props) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState<Category>("produce");
  const [newStorage, setNewStorage] = useState<Storage>("fridge");
  const [newDays, setNewDays] = useState("7");

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

  const newName = query.trim() || item?.displayName || "";

  function createFood() {
    if (!item || !newName.trim()) return;
    const days = Math.max(1, Number(newDays) || CATEGORY_DEFAULTS[newCategory].fridgeDays || 7);
    const entry: FoodEntry = {
      id: customFoodId(newName),
      name: newName.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      emoji: CATEGORY_DEFAULTS[newCategory].emoji,
      category: newCategory,
      aliases: [newName.trim().toLowerCase()],
      defaultStorage: newStorage,
      pantryDays: newStorage === "pantry" ? days : undefined,
      fridgeDays: newStorage === "fridge" ? days : undefined,
      freezerDays: newStorage === "freezer" ? days : undefined,
    };
    registerFood(entry);
    onCreateFood(item.id, entry);
    setCreating(false);
    setQuery("");
  }

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) {
          setQuery("");
          setCreating(false);
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

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-3.5" /> Not in the list? Add &ldquo;{newName}&rdquo; as a new food
          </button>
        ) : (
          <div className="space-y-2 rounded-lg border border-white/10 bg-muted/20 p-3">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Food name" className="font-medium" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as Category)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs dark:bg-input/30"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c} className="bg-popover">
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
              <select
                value={newStorage}
                onChange={(e) => setNewStorage(e.target.value as Storage)}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-xs dark:bg-input/30"
              >
                {STORAGE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-popover">
                    {s.label}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="1"
                value={newDays}
                onChange={(e) => setNewDays(e.target.value)}
                placeholder="Days"
                title="How many days it keeps in that storage"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={createFood} disabled={!newName.trim()}>
                Add food
              </Button>
            </div>
          </div>
        )}

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
