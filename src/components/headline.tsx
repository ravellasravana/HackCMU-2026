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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const animated = useAnimatedNumber(value);
  return (
    <div className="relative flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center backdrop-blur-sm">
      <div className={`font-mono text-4xl font-bold tabular-nums tracking-tight md:text-5xl ${color}`}>
        ${animated.toFixed(2)}
      </div>
      <div className="max-w-[10rem] text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

export function Headline({ plan, retailer, lifetimeSaved }: { plan: Plan; retailer: string | null; lifetimeSaved: number }) {
  const savedTotal = plan.savedByCooking + plan.savedByFreezing;
  const savedPct = plan.atRiskValue > 0 ? Math.round((savedTotal / plan.atRiskValue) * 100) : 100;
  const animatedPct = useAnimatedNumber(savedPct);

  return (
    <div className="animate-float-in relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 p-6 shadow-2xl md:p-8">
      {/* Shimmer overlay */}
      <div className="animate-shimmer pointer-events-none absolute inset-0 rounded-2xl" />

      <div className="relative z-10 space-y-6">
        {/* Label */}
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" />
          IFM K2 · Value-Maximising Plan · {retailer ?? "Grocery receipt"}
        </p>

        {/* Main comparison */}
        <div className="grid gap-4 sm:grid-cols-3 sm:items-center">
          <Stat
            label="Would go in the bin without a plan"
            value={plan.wastedNoPlan}
            color="text-rose-400"
          />

          <div className="flex flex-col items-center gap-1">
            <div className="text-5xl font-black tabular-nums tracking-tight text-emerald-300 md:text-7xl">
              {Math.round(animatedPct)}%
            </div>
            <div className="text-sm font-medium text-muted-foreground">of at-risk food rescued</div>
            <div className="mt-1 text-xs text-muted-foreground">
              by cooking · {plan.savedByFreezing > 0 ? `+ $${plan.savedByFreezing.toFixed(2)} frozen` : ""}
            </div>
          </div>

          <Stat
            label="Left to waste — with Dining Car"
            value={plan.wasted}
            color={plan.wasted === 0 ? "text-emerald-300" : "text-amber-300"}
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
            {plan.atRisk.length} items · <AnimatedMoney value={plan.atRiskValue} className="font-medium text-foreground" /> at risk this week
            {plan.wastedEarliestFirst > plan.wasted + 0.01 && (
              <> · earliest-expiry-first would still waste <span className="text-amber-300">${plan.wastedEarliestFirst.toFixed(2)}</span></>
            )}
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
