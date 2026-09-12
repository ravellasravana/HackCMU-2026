// n8n Code node — "Dollar-optimising scheduler"
// Mode: Run Once for All Items
//
// Input (from "Parse K2 dinners"): { items: [...dated items from "Shelf life & eat-by dates"], dinners: [...K2 dinners] }
// Output: one item { plan, decisions, summary, calendar, email } ready for Google Calendar + Gmail.
//
// Objective: one dinner per night for HORIZON nights, never use an item after its eat-by, maximise the
// dollar value of at-risk food eaten before it expires. Exact DP over (night, set of rescued items).

const HORIZON = 7;
const GROUNDING_THRESHOLD = 0.8;
const MAX_TRACKED = 16;
const STAPLES = new Set(['salt', 'black pepper', 'olive oil', 'garlic', 'butter', 'rice', 'pasta', 'flour', 'sugar', 'soy sauce', 'vinegar', 'canned tomatoes', 'chicken stock', 'dried spices', 'honey']);

const input = $input.first().json;
const items = input.items || [];
const dinners = (input.dinners || []).filter((d) => d && d.title && Array.isArray(d.ingredients));
const today = input.today || new Date().toISOString().slice(0, 10);

const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const money = (n) => '$' + n.toFixed(2);
const nice = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ---- grounding: verify every dinner against what is actually in the kitchen on night d ----
function ground(dinner, day) {
  const staples = (dinner.staples || []).filter((s) => STAPLES.has(s));
  let owned = staples.length, total = staples.length, keyMissing = false;
  const used = [], missing = [];
  for (const ing of dinner.ingredients) {
    const hits = items.filter((it) => it.canonical === ing.foodId && (it.daysLeft == null || it.daysLeft >= day));
    if (hits.length) { owned++; total++; hits.forEach((h) => used.push(h.id)); }
    else if (!ing.optional) { total++; missing.push(ing.foodId); if (ing.key) keyMissing = true; }
  }
  const score = total ? owned / total : 0;
  return { score, owned, total, missing, used, passes: !keyMissing && score >= GROUNDING_THRESHOLD };
}

// ---- at-risk items: perishable, not yet expired, expiring inside the horizon ----
const atRisk = items
  .filter((it) => !it.staple && it.daysLeft != null && it.daysLeft >= 0 && it.daysLeft < HORIZON)
  .sort((a, b) => b.price - a.price);
const tracked = atRisk.slice(0, MAX_TRACKED);
const bit = new Map(tracked.map((it, i) => [it.id, i]));
const value = (mask) => tracked.reduce((s, it, i) => (mask & (1 << i) ? s + it.price : s), 0);

const feasible = [];
for (let d = 0; d < HORIZON; d++) {
  feasible.push(dinners.map((dinner) => {
    const g = ground(dinner, d);
    if (!g.passes) return null;
    let mask = 0; const rescued = [];
    for (const id of g.used) if (bit.has(id)) { mask |= 1 << bit.get(id); rescued.push(id); }
    return { dinner, g, mask, rescued };
  }).filter(Boolean));
}

// ---- exact DP: layers[d] = Map(mask -> {value, prev, choice}) ----
const layers = [new Map([[0, { value: 0, prev: 0, choice: null }]])];
for (let d = 0; d < HORIZON; d++) {
  const next = new Map();
  for (const [mask, st] of layers[d]) {
    if (!next.has(mask) || next.get(mask).value < st.value) next.set(mask, { value: st.value, prev: mask, choice: null });
    for (const f of feasible[d]) {
      const gain = f.mask & ~mask;
      if (!gain) continue;
      const nm = mask | f.mask, v = st.value + value(gain);
      if (!next.has(nm) || next.get(nm).value < v) next.set(nm, { value: v, prev: mask, choice: f });
    }
  }
  layers.push(next);
}
let best = 0, bestV = -1;
for (const [m, st] of layers[HORIZON]) if (st.value > bestV) { bestV = st.value; best = m; }
const choices = new Array(HORIZON).fill(null);
for (let d = HORIZON, m = best; d > 0; d--) { const st = layers[d].get(m); choices[d - 1] = st.choice; m = st.prev; }

// zero-gain nights still get a grounded dinner, for variety
const usedTitles = new Set(choices.filter(Boolean).map((c) => c.dinner.title));
for (let d = 0; d < HORIZON; d++) {
  if (choices[d]) continue;
  const c = feasible[d].filter((f) => !usedTitles.has(f.dinner.title)).sort((a, b) => b.g.used.length - a.g.used.length || b.g.score - a.g.score)[0];
  if (c) { choices[d] = c; usedTitles.add(c.dinner.title); }
}

// ---- assemble plan, freeze-or-eat decisions, before/after numbers ----
const covered = new Set();
const plan = choices.map((c, d) => {
  const date = addDays(today, d);
  if (!c) return { day: d, date, title: null };
  const rescued = c.rescued.filter((id) => !covered.has(id));
  rescued.forEach((id) => covered.add(id));
  const saved = rescued.reduce((s, id) => s + (atRisk.find((it) => it.id === id) || { price: 0 }).price, 0);
  return { day: d, date, title: c.dinner.title, emoji: c.dinner.emoji || '🍽️', minutes: c.dinner.minutes, steps: c.dinner.steps || [],
    grounding: `Uses ${c.g.owned} of ${c.g.total} ingredients you own`, saved, rescues: rescued.map((id) => items.find((it) => it.id === id).name) };
});

const decisions = []; let frozen = 0, wasted = 0;
for (const it of atRisk) {
  if (covered.has(it.id)) continue;
  if (it.freezerDays && it.storage !== 'freezer') { decisions.push({ kind: 'freeze', item: it.name, by: it.eatBy, goodUntil: addDays(today, it.freezerDays), value: it.price }); frozen += it.price; }
  else { decisions.push({ kind: 'eat-now', item: it.name, by: it.eatBy, value: it.price }); wasted += it.price; }
}
const atRiskValue = atRisk.reduce((s, it) => s + it.price, 0);
const eaten = atRisk.filter((it) => covered.has(it.id)).reduce((s, it) => s + it.price, 0);

// "no plan" baseline: cook whatever comes first in the list, deadlines ignored, no repeats
const naiveCovered = new Set(); const naiveUsed = new Set();
for (let d = 0; d < HORIZON; d++) { const f = feasible[d].find((x) => !naiveUsed.has(x.dinner.title)); if (f) { naiveUsed.add(f.dinner.title); f.rescued.forEach((id) => naiveCovered.add(id)); } }
const wastedNoPlan = atRisk.filter((it) => !naiveCovered.has(it.id)).reduce((s, it) => s + it.price, 0);

const summary = { atRiskValue, eaten, frozen, wasted, wastedNoPlan, headline: `Without a plan: ${money(wastedNoPlan)} of this receipt goes in the bin. With Dining Car: ${money(wasted)}.` };

// ---- rows for Google Calendar (one eat-by alarm per perishable, one dinner event per night) ----
const calendar = [];
for (const it of items) if (!it.staple && it.eatBy && it.daysLeft >= 0) calendar.push({ kind: 'eat-by', title: `${it.emoji || '🥬'} ${it.name} — eat by`, date: it.eatBy, allDay: true, description: `Bought ${it.purchaseDate} for ${money(it.price)}. Stored in the ${it.storage}. Source: USDA FoodKeeper.` });
for (const n of plan) if (n.title) calendar.push({ kind: 'dinner', title: `${n.emoji} ${n.day === 0 ? 'Tonight' : 'Dinner'}: ${n.title}`, date: n.date, allDay: false, start: `${n.date}T18:30:00`, end: `${n.date}T19:30:00`, description: n.steps.join('\n') });
for (const dec of decisions) if (dec.kind === 'freeze') calendar.push({ kind: 'freeze', title: `🧊 Freeze the ${dec.item.toLowerCase()} today`, date: dec.by, allDay: true, description: `Frozen, it keeps until ${dec.goodUntil}.` });

// ---- summary email ----
const soon = items.filter((it) => !it.staple && it.daysLeft != null && it.daysLeft >= 0 && it.daysLeft < 7);
const tonight = plan[0];
const email = {
  subject: `${soon.length} items expire this week — tonight: ${tonight.title || 'nothing urgent'}`,
  text: [
    summary.headline, '',
    `Tonight: ${tonight.emoji || ''} ${tonight.title || '—'}${tonight.rescues && tonight.rescues.length ? ` (rescues ${money(tonight.saved)}: ${tonight.rescues.join(', ')})` : ''}`,
    tonight.grounding ? `  ${tonight.grounding}` : '', '',
    'Expiring this week:',
    ...soon.sort((a, b) => a.daysLeft - b.daysLeft).map((it) => `  ${it.emoji || '•'} ${it.name} — eat by ${nice(it.eatBy)} (${money(it.price)})`), '',
    ...(decisions.length ? ['Decisions:', ...decisions.map((d) => d.kind === 'freeze' ? `  🧊 Freeze the ${d.item.toLowerCase()} by ${nice(d.by)} — good until ${nice(d.goodUntil)}` : `  ⚠️ Eat the ${d.item.toLowerCase()} by ${nice(d.by)} or it's ${money(d.value)} in the bin`), ''] : []),
    'Rest of the week:',
    ...plan.slice(1).filter((n) => n.title).map((n) => `  ${nice(n.date)}: ${n.emoji} ${n.title}`),
  ].join('\n'),
};

return [{ json: { today, plan, decisions, summary, calendar, email } }];
