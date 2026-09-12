"use client";

import { useState } from "react";
import { Clock, Users, ShieldCheck, Snowflake, Sparkles, ChevronDown } from "lucide-react";
import { formatLongDate, formatMoney, formatRelativeDay, formatShortDate } from "@/lib/dates";
import type { DatedItem, NightPlan, Plan } from "@/lib/scheduler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

function rescuedNames(night: NightPlan, items: DatedItem[]): string[] {
  return night.rescuedItemIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is DatedItem => Boolean(i))
    .map((i) => i.displayName.toLowerCase());
}

function GroundingBadge({ night }: { night: NightPlan }) {
  if (!night.grounding) return null;
  const { owned, total } = night.grounding;
  return (
    <Badge variant="outline" className="gap-1 border-emerald-400/30 bg-emerald-400/10 font-normal text-emerald-200" title="LLM output verified against your inventory + pantry staples">
      <ShieldCheck className="size-3" /> Uses {owned} of {total} ingredients you own
    </Badge>
  );
}

function TonightCard({ night, items }: { night: NightPlan; items: DatedItem[] }) {
  const [open, setOpen] = useState(false);
  if (!night.recipe) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-5 text-sm text-muted-foreground">
          Nothing in the kitchen makes a grounded dinner tonight. Add what you bought, or paste a receipt.
        </CardContent>
      </Card>
    );
  }
  const rescued = rescuedNames(night, items);
  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/10 to-card">
      <CardHeader className="pb-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Tonight · {formatShortDate(night.date)}</p>
        <CardTitle className="flex items-start gap-3 text-xl leading-snug">
          <span className="text-3xl leading-none" aria-hidden>
            {night.recipe.emoji}
          </span>
          <span>{night.recipe.title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" /> {night.recipe.minutes} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" /> {night.recipe.servings} servings
          </span>
          {night.recipe.source === "k2" && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Sparkles className="size-3" /> K2
            </Badge>
          )}
        </div>
        <GroundingBadge night={night} />
        {rescued.length > 0 ? (
          <p className="text-sm">
            Rescues <span className="font-semibold text-emerald-300">{formatMoney(night.valueSaved)}</span> that would otherwise turn: {rescued.join(", ")}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing urgent tonight — this one just uses what you have.</p>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} /> {open ? "Hide" : "Show"} steps
        </button>
        {open && (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {night.recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function PlanPanel({ plan, items, today }: { plan: Plan; items: DatedItem[]; today: string }) {
  const [tonight, ...rest] = plan.nights;
  const upcoming = rest.filter((n) => n.recipe);

  return (
    <div className="space-y-4">
      <TonightCard night={tonight} items={items} />

      {upcoming.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rest of the week</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {upcoming.map((night) => {
                const rescued = rescuedNames(night, items);
                return (
                  <li key={night.date} className="flex items-start gap-3 px-4 py-2.5">
                    <div className="w-12 shrink-0 pt-0.5 text-xs font-medium capitalize text-muted-foreground">{formatRelativeDay(night.date, today)}</div>
                    <span className="text-lg leading-none" aria-hidden>
                      {night.recipe!.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium leading-snug">{night.recipe!.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rescued.length ? (
                          <>
                            <span className="text-emerald-300">{formatMoney(night.valueSaved)}</span> · {rescued.join(", ")}
                          </>
                        ) : (
                          <>uses {night.grounding?.owned} of {night.grounding?.total} ingredients you own</>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {(plan.decisions.length > 0 || plan.alreadyExpired.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Freeze-or-eat decisions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-0">
            {plan.decisions.map((d) => (
              <div key={d.item.id} className="flex items-start gap-2.5 text-sm">
                {d.kind === "freeze" ? (
                  <>
                    <Snowflake className="mt-0.5 size-4 shrink-0 text-sky-300" />
                    <p>
                      <span className="font-medium">Freeze the {d.item.displayName.toLowerCase()}</span> by {formatRelativeDay(d.freezeBy, today)} and it&apos;s good until{" "}
                      {formatLongDate(d.goodUntil)}. Saves {formatMoney(d.value)}.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
                      {d.item.emoji}
                    </span>
                    <p>
                      No dinner fits the <span className="font-medium">{d.item.displayName.toLowerCase()}</span> before {formatRelativeDay(d.by, today)} and it doesn&apos;t freeze well —
                      eat it as a snack or it&apos;s <span className="text-rose-300">{formatMoney(d.value)}</span> in the bin.
                    </p>
                  </>
                )}
              </div>
            ))}
            {plan.alreadyExpired.map((it) => (
              <div key={it.id} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
                  {it.emoji}
                </span>
                <p>
                  {it.displayName} passed its eat-by {it.eatBy ? formatRelativeDay(it.eatBy, today) : ""}. Check it before cooking with it.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
