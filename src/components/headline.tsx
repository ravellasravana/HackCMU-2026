"use client";

import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import type { Plan } from "@/lib/scheduler";

function AnimatedMoney({ value, prefix = "", className = "" }: { value: number; prefix?: string; className?: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <span className={className}>
      {prefix}${animated.toFixed(2)}
    </span>
  );
}

function CountStat({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <div className="relative flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center backdrop-blur-sm">
      <div className={`font-mono text-4xl font-bold tabular-nums tracking-tight md:text-5xl ${color}`}>
        {Math.round(animated)}
      </div>
      <div className="max-w-[10rem] text-xs text-muted-foreground">{label}</div>
      {sub && <div className="text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

export function Headline({ plan, retailer, lifetimeSaved }: { plan: Plan; retailer: string | null; lifetimeSaved: number }) {
  const savedTotal = plan.savedByCooking + plan.savedByFreezing;
  const savedPct = plan.atRiskValue > 0 ? Math.round((savedTotal / plan.atRiskValue) * 100) : 100;
  const animatedPct = useAnimatedNumber(savedPct);
  const rescuedCount = plan.coveredItemIds.size;
  const previewEmoji = [...new Set(plan.atRisk.map((i) => i.emoji))].slice(0, 8);

  return (
    <div className="animate-float-in relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-2xl md:p-8">
      {/* Shimmer overlay */}
      <div className="animate-shimmer pointer-events-none absolute inset-0 rounded-2xl" />

      <div className="relative z-10 space-y-6">
        {/* Label */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Fridge Rescue Plan · {retailer ?? "Grocery receipt"}
          </p>
          {previewEmoji.length > 0 && (
            <p className="text-xl leading-none" aria-hidden title="What's in your fridge right now">
              {previewEmoji.join(" ")}
            </p>
          )}
        </div>

        {/* Main comparison — food counts lead, dollars are supporting detail */}
        <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
          <CountStat
            label="items at risk this week"
            value={plan.atRisk.length}
            sub={`worth $${plan.atRiskValue.toFixed(2)}`}
            color="text-rose-400"
          />

          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black tabular-nums tracking-tight text-emerald-300 md:text-7xl">
              {Math.round(animatedPct)}%
            </div>
            <div className="text-sm font-medium text-muted-foreground">of your food rescued</div>
            <div className="mt-1 text-xs text-muted-foreground">
              by cooking{plan.savedByFreezing > 0 ? ` · $${plan.savedByFreezing.toFixed(2)} frozen` : ""}
            </div>
          </div>

          <CountStat
            label="items saved from the trash"
            value={rescuedCount}
            sub={savedTotal > 0 ? `$${savedTotal.toFixed(2)} kept out of the bin` : undefined}
            color="text-emerald-300"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-rose-500/25">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-1000 ease-out"
              style={{ width: `${savedPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Without a plan, <AnimatedMoney value={plan.wastedNoPlan} className="font-medium text-rose-300" /> of that would go in the bin.
            {" "}With Dining Car, only <AnimatedMoney value={plan.wasted} className="font-medium text-foreground" /> is left to waste.
          </p>
          {lifetimeSaved > 0 && (
            <p className="text-xs text-muted-foreground">
              <AnimatedMoney value={lifetimeSaved} className="font-medium text-emerald-300" /> rescued in previous weeks with Dining Car
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
