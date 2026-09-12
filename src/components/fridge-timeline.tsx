"use client";

import { Snowflake, Refrigerator, Home, Trash2, AlertTriangle } from "lucide-react";
import { addDays, daysBetween, formatMoney, formatRelativeDay, parseISODate } from "@/lib/dates";
import { FOOD_BY_ID, storageOptions } from "@/lib/foodkeeper";
import { CONFIDENCE_CONFIRM_THRESHOLD } from "@/lib/inventory";
import type { DatedItem, Plan } from "@/lib/scheduler";
import type { Storage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const AXIS_BEFORE = 2;
const AXIS_AFTER = 14;
const AXIS_SPAN = AXIS_BEFORE + AXIS_AFTER;

function urgency(daysLeft: number | null): "expired" | "red" | "amber" | "green" | "none" {
  if (daysLeft === null) return "none";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 1) return "red";
  if (daysLeft <= 3) return "amber";
  return "green";
}

const BAR_CLASS: Record<ReturnType<typeof urgency>, string> = {
  expired: "bg-[repeating-linear-gradient(135deg,var(--color-rose-500)_0_6px,transparent_6px_12px)] opacity-50",
  red: "bg-gradient-to-r from-rose-500/70 to-rose-400",
  amber: "bg-gradient-to-r from-amber-500/60 to-amber-400",
  green: "bg-gradient-to-r from-emerald-500/50 to-emerald-400",
  none: "bg-muted",
};

const TEXT_CLASS: Record<ReturnType<typeof urgency>, string> = {
  expired: "text-rose-300",
  red: "text-rose-300",
  amber: "text-amber-300",
  green: "text-emerald-300",
  none: "text-muted-foreground",
};

function daysLeftLabel(item: DatedItem, today: string): string {
  if (!item.eatBy || item.daysLeft === null) return "no data";
  if (item.daysLeft < 0) return `past by ${-item.daysLeft}d`;
  if (item.daysLeft === 0) return "eat today";
  if (item.daysLeft === 1) return "eat by tomorrow";
  return `eat by ${formatRelativeDay(item.eatBy, today)}`;
}

const STORAGE_META: Record<Storage, { label: string; icon: typeof Snowflake }> = {
  pantry: { label: "Counter", icon: Home },
  fridge: { label: "Fridge", icon: Refrigerator },
  freezer: { label: "Freezer", icon: Snowflake },
};

interface Props {
  items: DatedItem[];
  plan: Plan;
  today: string;
  onStorageChange: (id: string, storage: Storage) => void;
  onConfirm: (item: DatedItem) => void;
  onRemove: (id: string) => void;
}

export function FridgeTimeline({ items, plan, today, onStorageChange, onConfirm, onRemove }: Props) {
  const axisStart = addDays(today, -AXIS_BEFORE);
  const firstUse = new Map<string, number>();
  for (const night of plan.nights) {
    for (const id of night.grounding?.usedItemIds ?? []) {
      if (!firstUse.has(id)) firstUse.set(id, night.dayOffset);
    }
  }

  const perishables = items
    .filter((i) => !i.staple)
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || b.price - a.price);
  const staples = items.filter((i) => i.staple);

  const pct = (iso: string) => Math.min(100, Math.max(0, (daysBetween(axisStart, iso) / AXIS_SPAN) * 100));

  return (
    <div className="space-y-2">
      <div className="hidden items-center gap-3 pl-[13.5rem] pr-[7.5rem] text-[10px] uppercase tracking-wider text-muted-foreground md:flex">
        <div className="relative h-4 flex-1">
          {Array.from({ length: AXIS_SPAN + 1 }).map((_, i) => {
            const iso = addDays(axisStart, i);
            const offset = i - AXIS_BEFORE;
            const d = parseISODate(iso);
            const label = offset === 0 ? "Today" : offset === 7 ? "+1 wk" : offset === 14 ? "+2 wk" : offset > 0 && offset < 7 ? ["S", "M", "T", "W", "T", "F", "S"][d.getDay()] : "";
            return (
              <span
                key={iso}
                className={cn("absolute -translate-x-1/2", offset === 0 && "font-semibold text-primary")}
                style={{ left: `${(i / AXIS_SPAN) * 100}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      <ul className="divide-y divide-border/60 rounded-xl border bg-card/60">
        {perishables.map((item) => {
          const level = urgency(item.daysLeft);
          const entry = FOOD_BY_ID[item.foodId];
          const options = storageOptions(entry, item.category);
          const needsConfirm = !item.confirmed && item.confidence < CONFIDENCE_CONFIRM_THRESHOLD;
          const usedOn = firstUse.get(item.id);
          const start = pct(item.purchaseDate);
          const end = item.eatBy ? pct(item.eatBy) : 100;
          const clippedRight = item.eatBy ? daysBetween(axisStart, item.eatBy) > AXIS_SPAN : true;

          return (
            <li key={item.id} className="group grid gap-2 px-3 py-2.5 md:grid-cols-[13rem_1fr_7rem] md:items-center md:gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="text-xl leading-none" aria-hidden>
                  {item.emoji}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{item.displayName}</span>
                    {needsConfirm && (
                      <button
                        type="button"
                        onClick={() => onConfirm(item)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-400/20"
                        title={`Matched "${item.rawLine}" at ${(item.confidence * 100).toFixed(0)}% confidence — tap to confirm`}
                      >
                        <AlertTriangle className="size-3" /> Confirm?
                      </button>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground" title={item.rawLine}>
                    {item.unit ? `${item.unit} · ` : item.quantity > 1 ? `×${item.quantity} · ` : ""}
                    {formatMoney(item.price)}
                    {item.source === "manual" && item.price > 0 ? " est." : ""}
                    {item.source === "receipt" && item.rawLine !== item.displayName ? ` · ${item.rawLine.replace(/\$?\d+\.\d{2}.*$/, "").trim().slice(0, 28)}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-muted/40">
                  <div className="absolute inset-y-0 w-px bg-primary/70" style={{ left: `${(AXIS_BEFORE / AXIS_SPAN) * 100}%` }} />
                  <div
                    className={cn("absolute inset-y-1 rounded-sm transition-all duration-500", BAR_CLASS[level], clippedRight && "rounded-r-none")}
                    style={{ left: `${start}%`, width: `${Math.max(1.5, end - start)}%` }}
                    title={item.eatBy ? `Bought ${item.purchaseDate} · eat by ${item.eatBy}` : "No shelf-life data"}
                  />
                  {usedOn !== undefined && (
                    <div
                      className="absolute top-0 flex h-full -translate-x-1/2 items-center text-[10px]"
                      style={{ left: `${pct(addDays(today, usedOn))}%` }}
                      title={`Planned for ${usedOn === 0 ? "tonight" : formatRelativeDay(addDays(today, usedOn), today)}`}
                    >
                      <span className="rounded-full bg-background/90 px-1 leading-4 shadow ring-1 ring-border">🍴</span>
                    </div>
                  )}
                </div>
                <span className={cn("w-28 shrink-0 text-right text-xs font-medium tabular-nums", TEXT_CLASS[level])}>{daysLeftLabel(item, today)}</span>
              </div>

              <div className="flex items-center justify-between gap-1 md:justify-end">
                <div className="flex items-center rounded-md border bg-background/40 p-0.5">
                  {options.map((opt) => {
                    const Icon = STORAGE_META[opt].icon;
                    const active = item.storage === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onStorageChange(item.id, opt)}
                        className={cn(
                          "rounded p-1 transition-colors",
                          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                        title={`${STORAGE_META[opt].label}${active ? " (current)" : ""}`}
                        aria-pressed={active}
                        aria-label={`Store in ${STORAGE_META[opt].label.toLowerCase()}`}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground opacity-60 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove ${item.displayName}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {staples.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1 text-xs text-muted-foreground">
          <span className="mr-1">Pantry, no clock:</span>
          {staples.map((s) => (
            <Badge key={s.id} variant="outline" className="gap-1 font-normal">
              <span aria-hidden>{s.emoji}</span> {s.displayName}
              <button type="button" onClick={() => onRemove(s.id)} className="ml-0.5 text-muted-foreground hover:text-rose-300" aria-label={`Remove ${s.displayName}`}>
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
