"use client";

import { Snowflake, Refrigerator, Home, Trash2, AlertTriangle, Pencil } from "lucide-react";
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

const BAR_BG: Record<ReturnType<typeof urgency>, string> = {
  expired: "bg-rose-500/30 striped",
  red: "bg-gradient-to-r from-rose-600/80 to-rose-400",
  amber: "bg-gradient-to-r from-amber-500/70 to-amber-400",
  green: "bg-gradient-to-r from-emerald-600/60 to-emerald-400",
  none: "bg-muted/60",
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
  if (item.daysLeft < 0) return `expired ${-item.daysLeft}d ago`;
  if (item.daysLeft === 0) return "eat TODAY";
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
  onEdit: (item: DatedItem) => void;
}

export function FridgeTimeline({ items, plan, today, onStorageChange, onConfirm, onRemove, onEdit }: Props) {
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
      {/* Axis labels — desktop only */}
      <div className="hidden items-center gap-3 pl-[14rem] pr-[8rem] text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:flex">
        <div className="relative h-4 flex-1">
          {Array.from({ length: AXIS_SPAN + 1 }).map((_, i) => {
            const iso = addDays(axisStart, i);
            const offset = i - AXIS_BEFORE;
            const d = parseISODate(iso);
            const label =
              offset === 0 ? "Today" :
              offset === 7 ? "+1 wk" :
              offset === 14 ? "+2 wk" :
              (offset > 0 && offset < 7) ? ["S", "M", "T", "W", "T", "F", "S"][d.getDay()] :
              "";
            return (
              <span
                key={iso}
                className={cn(
                  "absolute -translate-x-1/2 transition-colors",
                  offset === 0 && "font-bold text-primary",
                )}
                style={{ left: `${(i / AXIS_SPAN) * 100}%` }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Timeline rows */}
      <ul className="overflow-hidden rounded-2xl border border-white/8 bg-card/70 backdrop-blur-sm">
        {perishables.map((item, idx) => {
          const level = urgency(item.daysLeft);
          const entry = FOOD_BY_ID[item.foodId];
          const options = storageOptions(entry, item.category);
          const needsConfirm = !item.confirmed && item.confidence < CONFIDENCE_CONFIRM_THRESHOLD;
          const usedOn = firstUse.get(item.id);
          const start = pct(item.purchaseDate);
          const end = item.eatBy ? pct(item.eatBy) : 100;
          const clippedRight = item.eatBy ? daysBetween(axisStart, item.eatBy) > AXIS_SPAN : true;
          const isRescued = plan.coveredItemIds.has(item.id);

          return (
            <li
              key={item.id}
              className="group animate-slide-up divide-x divide-border/40 border-b border-border/40 last:border-b-0 md:grid md:grid-cols-[14rem_1fr_8rem]"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Name cell */}
              <div className="flex min-w-0 items-center gap-2.5 px-3 py-2.5 md:py-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-xl",
                    isRescued ? "bg-emerald-400/15" : level === "red" ? "bg-rose-400/15" : level === "amber" ? "bg-amber-400/10" : "bg-muted/40",
                  )}
                >
                  {item.emoji}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="truncate text-sm font-medium leading-none">{item.displayName}</span>
                    {isRescued && (
                      <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        planned
                      </span>
                    )}
                    {needsConfirm && (
                      <button
                        type="button"
                        onClick={() => onConfirm(item)}
                        className="inline-flex items-center gap-0.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-400/20"
                        title={`Matched at ${(item.confidence * 100).toFixed(0)}% — tap to confirm`}
                      >
                        <AlertTriangle className="size-2.5" /> confirm?
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-1 text-[11px] text-muted-foreground">
                    <span>{formatMoney(item.price)}</span>
                    {item.quantity > 1 && <span>· ×{item.quantity}</span>}
                    {item.unit && <span>· {item.unit}</span>}
                  </div>
                </div>
              </div>

              {/* Timeline bar cell */}
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-muted/30">
                  {/* Today marker */}
                  <div
                    className="absolute inset-y-0 w-px bg-primary/60"
                    style={{ left: `${(AXIS_BEFORE / AXIS_SPAN) * 100}%` }}
                  />
                  {/* Shelf-life bar */}
                  <div
                    className={cn(
                      "bar-grow absolute inset-y-1.5 rounded",
                      BAR_BG[level],
                      clippedRight && "rounded-r-none",
                    )}
                    style={{
                      left: `${start}%`,
                      width: `${Math.max(1.5, end - start)}%`,
                      animationDelay: `${idx * 50 + 300}ms`,
                    }}
                    title={item.eatBy ? `Eat by ${item.eatBy}` : "No shelf-life data"}
                  />
                  {/* Planned-use marker */}
                  {usedOn !== undefined && (
                    <div
                      className="absolute top-0 flex h-full -translate-x-1/2 items-center"
                      style={{ left: `${pct(addDays(today, usedOn))}%` }}
                    >
                      <span className="z-10 rounded-full bg-card/90 px-1 text-[10px] shadow ring-1 ring-border">
                        🍴
                      </span>
                    </div>
                  )}
                </div>
                <span className={cn("hidden w-28 shrink-0 text-right text-[11px] font-semibold tabular-nums md:block", TEXT_CLASS[level])}>
                  {daysLeftLabel(item, today)}
                </span>
              </div>

              {/* Controls cell */}
              <div className="flex items-center justify-end gap-1 px-2 py-2">
                <div className="flex overflow-hidden rounded-lg border border-white/10 bg-background/30">
                  {options.map((opt) => {
                    const Icon = STORAGE_META[opt].icon;
                    const active = item.storage === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onStorageChange(item.id, opt)}
                        className={cn(
                          "px-1.5 py-1.5 text-xs transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
                  className="shrink-0 text-muted-foreground opacity-60 hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
                  onClick={() => onEdit(item)}
                  aria-label={`Edit ${item.displayName}`}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground opacity-60 hover:text-rose-300 md:opacity-0 md:group-hover:opacity-100"
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
          <span className="mr-1 font-medium">Pantry (no clock):</span>
          {staples.map((s) => (
            <Badge key={s.id} variant="outline" className="gap-1 font-normal opacity-60">
              <span aria-hidden>{s.emoji}</span> {s.displayName}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                className="ml-0.5 opacity-70 hover:text-rose-300"
                aria-label={`Remove ${s.displayName}`}
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
