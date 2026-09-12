"use client";

import { useState } from "react";
import { Clock, Users, ShieldCheck, Snowflake, Sparkles, ChevronDown, ChefHat, Volume2, Loader2 } from "lucide-react";
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
  const { owned, total, score } = night.grounding;
  const pct = Math.round(score * 100);
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
      title="Every ingredient verified against what you actually own + pantry staples"
    >
      <ShieldCheck className="size-3.5" />
      Uses {owned} of {total} ingredients you own ({pct}% grounded)
    </div>
  );
}

/** Reads the plan aloud via ElevenLabs (server-proxied — see /api/speak). */
function SpeakButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");

  async function speak() {
    if (state === "loading" || state === "playing") return;
    setState("loading");
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        throw new Error(data.error ?? `Speech request failed (${res.status})`);
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audio.onended = () => {
        setState("idle");
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState("error");
        URL.revokeObjectURL(url);
      };
      setState("playing");
      await audio.play();
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={speak}
      disabled={state === "loading" || state === "playing"}
      title="Read tonight's plan aloud"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-70",
        state === "error"
          ? "border-white/10 bg-white/5 text-muted-foreground"
          : "animate-glow-pulse border-primary/40 bg-primary/15 text-primary hover:bg-primary/25",
      )}
    >
      {state === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Volume2 className="size-3.5" />}
      {state === "error" ? "Voice unavailable" : state === "playing" ? "Playing…" : "🔊 Read it to me"}
    </button>
  );
}

function TonightCard({ night, items }: { night: NightPlan; items: DatedItem[] }) {
  const [open, setOpen] = useState(false);
  if (!night.recipe) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          <div className="mb-2 text-3xl">🤷</div>
          Nothing in your kitchen makes a complete dinner tonight. Add more items or paste a receipt.
        </CardContent>
      </Card>
    );
  }

  const rescued = rescuedNames(night, items);
  const hasRescue = rescued.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/15 via-card to-card shadow-xl">
      {/* Glow */}
      <div className="pointer-events-none absolute -top-10 left-1/2 size-40 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative p-6">
        {/* Badge */}
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
            <ChefHat className="size-3" />
            Tonight · {formatShortDate(night.date)}
          </div>
          <div className="flex items-center gap-2">
            {night.recipe.source !== "library" && (
              <Badge variant="secondary" className="gap-1 text-xs font-normal">
                <Sparkles className="size-3 text-primary" />
                {night.recipe.source === "gemini" ? "Gemini recipe" : "IFM K2 recipe"}
              </Badge>
            )}
            <SpeakButton
              text={`Tonight: ${night.recipe.title}.${rescued.length ? ` This rescues ${formatMoney(night.valueSaved)} of food that would otherwise spoil.` : ""}`}
            />
          </div>
        </div>

        {/* Emoji + Title */}
        <div className="mb-4 flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-4xl shadow-inner">
            {night.recipe.emoji}
          </div>
          <div>
            <h3 className="text-xl font-bold leading-tight">{night.recipe.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="size-3" />{night.recipe.minutes} min</span>
              <span className="flex items-center gap-1"><Users className="size-3" />{night.recipe.servings} servings</span>
            </div>
          </div>
        </div>

        <GroundingBadge night={night} />

        {hasRescue && (
          <div className="mt-3 rounded-xl bg-emerald-400/10 px-4 py-3 text-sm">
            <span className="font-semibold text-emerald-300">Saves {formatMoney(night.valueSaved)}</span>{" "}
            <span className="text-muted-foreground">tonight — rescues {rescued.join(", ")} before they turn.</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-4 flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <span>How to make it</span>
          <ChevronDown className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")} />
        </button>

        {open && (
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {night.recipe.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export function PlanPanel({ plan, items, today }: { plan: Plan; items: DatedItem[]; today: string }) {
  const [tonight, ...rest] = plan.nights;
  const upcoming = rest.filter((n) => n.recipe);

  return (
    <div className="space-y-4">
      <TonightCard night={tonight} items={items} />

      {upcoming.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-0 pt-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Rest of the week
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {upcoming.map((night) => {
                const rescued = rescuedNames(night, items);
                return (
                  <li key={night.date} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                      {formatRelativeDay(night.date, today)}
                    </div>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
                      {night.recipe!.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{night.recipe!.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rescued.length > 0 ? (
                          <>
                            <span className="font-medium text-emerald-300">{formatMoney(night.valueSaved)}</span>{" "}
                            saved · {rescued.join(", ")}
                          </>
                        ) : (
                          <>{night.grounding?.owned}/{night.grounding?.total} ingredients you own</>
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
        <Card className="border-amber-400/20 bg-amber-400/5">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-300">
              <Snowflake className="size-3.5" />
              Freeze-or-eat decisions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4 pt-0">
            {plan.decisions.map((d) => (
              <div key={d.item.id} className="flex items-start gap-3 text-sm">
                {d.kind === "freeze" ? (
                  <>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                      <Snowflake className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sky-200">Freeze the {d.item.displayName.toLowerCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        Freeze by {formatRelativeDay(d.freezeBy, today)} → good until {formatLongDate(d.goodUntil)}. Saves {formatMoney(d.value)}.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-400/10 text-xl">
                      {d.item.emoji}
                    </div>
                    <div>
                      <p className="font-semibold text-rose-200">Eat the {d.item.displayName.toLowerCase()} as a snack</p>
                      <p className="text-xs text-muted-foreground">
                        Doesn&apos;t freeze well. Eat by {formatRelativeDay(d.by, today)} or {formatMoney(d.value)} goes in the bin.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
            {plan.alreadyExpired.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{it.emoji}</span>
                {it.displayName} passed its eat-by {it.eatBy ? formatRelativeDay(it.eatBy, today) : ""}. Check before cooking.
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
