import { addDays } from "./dates";
import type { DatedItem, Plan } from "./scheduler";

function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function fold(line: string): string {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    out.push(rest.slice(0, 73));
    rest = " " + rest.slice(73);
  }
  out.push(rest);
  return out.join("\r\n");
}

/**
 * Build a calendar file: one all-day "eat by" alarm per perishable and one
 * "Tonight: …" event per planned dinner. Mirrors what the n8n workflow writes to Google Calendar.
 */
export function buildCalendar(items: DatedItem[], plan: Plan, today: string): string {
  const stamp = icsDate(today) + "T000000Z";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dining Car//Eat-by alarms//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Dining Car — eat-by alarms",
  ];

  for (const item of items) {
    if (item.staple || !item.eatBy || (item.daysLeft ?? 0) < 0) continue;
    const summary = `${item.emoji} ${item.displayName} — eat by`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:diningcar-eatby-${item.id}@diningcar.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(item.eatBy)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(item.eatBy, 1))}`,
      fold(`SUMMARY:${escapeText(summary)}`),
      fold(`DESCRIPTION:${escapeText(`Bought ${item.purchaseDate} for $${item.price.toFixed(2)}. Stored in the ${item.storage}. Source: USDA FoodKeeper.`)}`),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(`${item.displayName} should be eaten today`)}`,
      "TRIGGER:-PT15H",
      "END:VALARM",
      "END:VEVENT",
    );
  }

  for (const night of plan.nights) {
    if (!night.recipe) continue;
    const label = night.dayOffset === 0 ? "Tonight" : "Dinner";
    lines.push(
      "BEGIN:VEVENT",
      `UID:diningcar-dinner-${night.date}@diningcar.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(night.date)}T183000`,
      `DTEND:${icsDate(night.date)}T193000`,
      fold(`SUMMARY:${escapeText(`${night.recipe.emoji} ${label}: ${night.recipe.title}`)}`),
      fold(`DESCRIPTION:${escapeText(night.recipe.steps.join("\n"))}`),
      "END:VEVENT",
    );
  }

  for (const decision of plan.decisions) {
    if (decision.kind !== "freeze") continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:diningcar-freeze-${decision.item.id}@diningcar.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(decision.freezeBy)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(decision.freezeBy, 1))}`,
      fold(`SUMMARY:${escapeText(`🧊 Freeze the ${decision.item.displayName.toLowerCase()} today`)}`),
      fold(`DESCRIPTION:${escapeText(`Frozen, it keeps until ${decision.goodUntil}.`)}`),
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
