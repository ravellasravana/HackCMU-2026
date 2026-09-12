"use client";

import { formatMoney } from "@/lib/dates";
import type { Plan } from "@/lib/scheduler";
import { Card, CardContent } from "@/components/ui/card";

export function Headline({ plan, retailer }: { plan: Plan; retailer: string | null }) {
  const savedPct = plan.atRiskValue > 0 ? Math.round(((plan.savedByCooking + plan.savedByFreezing) / plan.atRiskValue) * 100) : 100;
  const receiptLabel = retailer ? `this ${retailer} receipt` : "this receipt";

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/10">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Value-maximising dinner plan</p>
          <h2 className="text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
            Without a plan:{" "}
            <span className="text-rose-300">{formatMoney(plan.wastedNoPlan)}</span> of {receiptLabel} goes in the bin.
            <br />
            With Dining Car:{" "}
            <span className="text-emerald-300">{formatMoney(plan.wasted)}</span>.
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatMoney(plan.atRiskValue)} of food expires in the next 7 days.{" "}
            The scheduler eats {formatMoney(plan.savedByCooking)} of it in {plan.nights.filter((n) => n.valueSaved > 0).length} dinners
            {plan.savedByFreezing > 0 ? ` and freezes ${formatMoney(plan.savedByFreezing)} before it turns` : ""}.
            {plan.wastedEarliestFirst > plan.wasted + 0.005 && (
              <> Earliest-expiry-first — the obvious scheduler — would still bin {formatMoney(plan.wastedEarliestFirst)}.</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-1">
          <div className="text-5xl font-semibold tabular-nums tracking-tight text-emerald-300 md:text-6xl">{savedPct}%</div>
          <div className="text-sm text-muted-foreground md:text-right">
            of at-risk food
            <br className="hidden md:block" /> rescued
          </div>
        </div>
      </CardContent>
      <div className="h-1.5 w-full bg-rose-500/30">
        <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: `${savedPct}%` }} />
      </div>
    </Card>
  );
}
