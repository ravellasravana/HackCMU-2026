import { FOODKEEPER } from "./foodkeeper";
import type { Category, ExtractedLine } from "./types";

/**
 * Receipt-speak → English. Retailers abbreviate aggressively (`ORG BBY SPNCH 5OZ`),
 * so we expand token-by-token before fuzzy matching against FoodKeeper aliases.
 */
const ABBREVIATIONS: Record<string, string> = {
  org: "organic", orgnc: "organic", bby: "baby", spnch: "spinach", spin: "spinach",
  chkn: "chicken", ckn: "chicken", chk: "chicken", brst: "breast", brsts: "breast", bnls: "boneless",
  sknls: "skinless", sknlss: "skinless", thgh: "thighs", thghs: "thighs",
  strwbry: "strawberries", strwb: "strawberries", strawb: "strawberries", strw: "strawberries",
  blubry: "blueberries", blbry: "blueberries", rspbry: "raspberries",
  mlk: "milk", whl: "whole", gal: "gallon", hg: "half gallon", lg: "large", xl: "large", sm: "small", md: "medium",
  grnd: "ground", grd: "ground", bf: "beef", trky: "turkey", tky: "turkey",
  avoc: "avocado", avcdo: "avocado", avo: "avocado", hass: "avocado",
  tmto: "tomato", tomat: "tomato", tmts: "tomatoes", bll: "bell", pppr: "pepper", ppprs: "peppers", pepp: "pepper",
  chs: "cheese", chse: "cheese", shrd: "shredded", shred: "shredded", chdr: "cheddar", cheddr: "cheddar", mozz: "mozzarella",
  ygrt: "yogurt", yog: "yogurt", grk: "greek", slmn: "salmon", flt: "fillet", fil: "fillet",
  brd: "bread", wht: "wheat", trtl: "tortillas", trtlla: "tortillas", trtls: "tortillas",
  bnna: "banana", bnns: "bananas", onn: "onion", onin: "onion", yel: "yellow", lmn: "lemon", lmns: "lemons", lms: "limes",
  brocc: "broccoli", brccli: "broccoli", crrts: "carrots", crrt: "carrot", ptato: "potato", pot: "potato",
  mshrm: "mushroom", mshrms: "mushrooms", bcn: "bacon", ssg: "sausage", ital: "italian",
  dz: "dozen", ct: "count", pk: "pack", pkg: "pack", sr: "sour", crm: "cream", hvy: "heavy", blk: "black", bns: "beans",
  frz: "frozen", frzn: "frozen", veg: "vegetables", oj: "orange juice", evoo: "olive oil", olv: "olive",
  pb: "peanut butter", pnt: "peanut", bttr: "butter", btr: "butter", unsltd: "unsalted", sltd: "salted",
  rce: "rice", psta: "pasta", sce: "sauce", brth: "broth", wtr: "water", sprkl: "sparkling", cff: "coffee",
  crl: "cereal", chps: "chips", grps: "grapes", appl: "apple", appls: "apples", orng: "orange", mngo: "mango",
  cucmbr: "cucumber", zucch: "zucchini", asprgs: "asparagus", clntro: "cilantro", grlc: "garlic", gngr: "ginger",
  clry: "celery", cbbg: "cabbage", cflwr: "cauliflower", lttce: "lettuce", rmn: "romaine",
  swt: "sweet", prk: "pork", stk: "steak", shrmp: "shrimp", tf: "tofu", hmms: "hummus",
  jce: "juice", eggs: "eggs", egg: "eggs", lrg: "large", bgls: "bagels", grn: "green", red: "red",
  bnch: "bunch", ea: "each", pce: "piece", fam: "family", sz: "size", vlu: "value",
};

const NOISE_TOKENS = new Set([
  "organic", "fresh", "large", "small", "medium", "pack", "bag", "bunch", "each", "count", "oz", "lb", "lbs",
  "g", "kg", "ml", "l", "fl", "family", "size", "value", "premium", "select", "natural", "farm", "farms",
  "brand", "kirkland", "great", "365", "simple", "truth", "good", "gather", "marketside", "mrktsd", "signature", "o", "gv",
  "private", "selection", "the", "a", "of", "and", "with", "x", "qty", "item", "items", "per", "approx", "gallon",
  "half", "dozen", "whole", "wheat", "sliced", "boneless", "skinless", "raw", "unsalted", "salted", "extra", "firm",
  "sweet", "yellow", "red", "green", "white", "brown", "italian", "plain", "vanilla", "lowfat", "low", "fat", "free", "reduced",
]);

/** Lines that describe the order rather than an item. */
const SKIP_PATTERNS = [
  /\b(sub ?total|total|tax|tip|delivery|service fee|fee|savings|discount|coupon|promo|payment|visa|mastercard|amex|card ending|refund|order #|order number|thank you|thanks|receipt|invoice|shopper|deliver(ed|y)|placed|items? in (this|your) order|replacement|out of stock|help|support|manage|view order|track|unsubscribe|balance|change|cash back|loyalty|rewards|points|estimated|bag fee|bottle deposit|you saved|http|www\.|@)\b/i,
  /^\s*[-=_*]{3,}\s*$/,
  /^\s*$/,
  /^\s*\(?\d*\)?\s*items?\b/i,
  /^\s*(st|op|te|tr|reg|cashier|store)\s*#/i,
];

const MONEY_RE = /\$?\s*(\d{1,4}\.\d{2})\b/g;

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%&/\s.-]/g, " ")
    .split(/[\s/,-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

function expand(tokens: string[]): string[] {
  const out: string[] = [];
  for (const raw of tokens) {
    const t = raw.replace(/\d+(\.\d+)?(oz|lb|lbs|ct|g|kg|ml|pk)?/g, (m) => (/(oz|lb|lbs|ct|g|kg|ml|pk)$/.test(m) ? "" : m));
    if (!t) continue;
    if (/^\d+(\.\d+)?%?$/.test(t)) continue;
    const exp = ABBREVIATIONS[t];
    if (exp) out.push(...exp.split(" "));
    else out.push(t);
  }
  return out;
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  const str = ` ${s} `;
  for (let i = 0; i < str.length - 1; i++) out.add(str.slice(i, i + 2));
  return out;
}

function dice(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function singular(t: string): string {
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.endsWith("oes")) return t.slice(0, -2);
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export interface MatchCandidate {
  foodId: string;
  score: number;
}

/**
 * Score a cleaned description against every FoodKeeper alias.
 * Whole-phrase hits score highest and are boosted by how much of the line they explain;
 * otherwise we fall back to bigram similarity between tokens.
 */
export function matchFood(description: string): { best: MatchCandidate | null; candidates: MatchCandidate[] } {
  const expanded = expand(tokenize(description)).filter((t) => t.length > 1);
  const meaningful = expanded.filter((t) => !NOISE_TOKENS.has(t));
  const tokens = meaningful.length ? meaningful : expanded;
  const joined = ` ${expanded.join(" ")} `;
  const tokenSingulars = tokens.map(singular);

  const scores: MatchCandidate[] = [];
  for (const entry of FOODKEEPER) {
    let best = 0;
    for (const alias of entry.aliases) {
      const aliasTokens = alias.split(" ");
      let s = 0;
      if (joined.includes(` ${alias} `) || joined.includes(` ${alias}s `) || joined.includes(` ${singular(alias)} `)) {
        const coverage = Math.min(1, aliasTokens.length / Math.max(1, tokens.length));
        s = 0.5 + 0.5 * coverage;
      } else {
        // token-level fuzzy: each alias token finds its closest description token
        let sum = 0;
        for (const at of aliasTokens) {
          let bestTok = 0;
          for (const tt of tokenSingulars) bestTok = Math.max(bestTok, dice(singular(at), tt));
          sum += bestTok;
        }
        const avg = sum / aliasTokens.length;
        const coverage = Math.min(1, aliasTokens.length / Math.max(1, tokens.length));
        s = avg * (0.7 + 0.2 * coverage);
      }
      // longer aliases are more specific; break ties in their favour
      s += alias.length * 0.0005;
      if (s > best) best = s;
    }
    if (best > 0.3) scores.push({ foodId: entry.id, score: Math.round(Math.min(1, best) * 100) / 100 });
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0] && scores[0].score >= 0.45 ? scores[0] : null;
  return { best, candidates: scores.slice(0, 5) };
}

function guessCategory(desc: string): Category {
  const d = desc.toLowerCase();
  if (/frozen|frz|ice cream|pizza/.test(d)) return "frozen";
  if (/juice|soda|water|seltzer|cola|drink|tea|kombucha/.test(d)) return "beverage";
  if (/chicken|beef|pork|steak|turkey|bacon|sausage|lamb|ham/.test(d)) return "meat";
  if (/salmon|shrimp|fish|tuna|cod|tilapia|crab/.test(d)) return "seafood";
  if (/milk|cheese|yogurt|cream|butter|kefir/.test(d)) return "dairy";
  if (/bread|bagel|bun|roll|tortilla|muffin|croissant|cake|loaf/.test(d)) return "bakery";
  if (/can|canned|rice|pasta|sauce|oil|flour|sugar|cereal|chips|crackers|snack|beans|nuts|coffee|spice/.test(d)) return "pantry";
  if (/deli|hummus|salsa|dip|prepared|salad kit|guac/.test(d)) return "deli";
  return "produce";
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize one receipt line into a canonical food with a confidence score. */
export function normalizeLine(rawLine: string): ExtractedLine | null {
  const line = rawLine.replace(/\s+/g, " ").trim();
  if (!line || SKIP_PATTERNS.some((re) => re.test(line))) return null;

  const moneyMatches = [...line.matchAll(MONEY_RE)].map((m) => Number(m[1]));
  const price = moneyMatches.length ? moneyMatches[moneyMatches.length - 1] : 0;

  let desc = line.replace(MONEY_RE, " ");
  desc = desc.replace(/@\s*\/?\s*(lb|oz|ea|each)/gi, " ");

  let quantity = 1;
  let unit: string | undefined;
  const qtyLead = desc.match(/^\s*(\d+)\s*[x×]\s+/i) || desc.match(/^\s*(\d+)\s+(?=[a-z])/i);
  if (qtyLead) {
    quantity = Number(qtyLead[1]);
    desc = desc.slice(qtyLead[0].length);
  }
  const qtyTrail = desc.match(/\b(?:x|qty)\s*(\d+)\b/i);
  if (qtyTrail) {
    quantity = Number(qtyTrail[1]);
    desc = desc.replace(qtyTrail[0], " ");
  }
  const weight = desc.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|oz|kg|g|gal)\b/i);
  if (weight) {
    unit = `${weight[1]} ${weight[2].toLowerCase().replace("lbs", "lb")}`;
    desc = desc.replace(weight[0], " ");
  }
  const count = desc.match(/(\d+)\s*(ct|count|pk|pack|dozen|dz)\b/i);
  if (count) {
    unit = `${count[1]} ${count[2].toLowerCase()}`;
    desc = desc.replace(count[0], " ");
  }

  desc = desc.replace(/[|*#]+/g, " ").replace(/\s+/g, " ").trim();
  if (desc.length < 2 || !/[a-z]/i.test(desc)) return null;

  const { best } = matchFood(desc);
  const expandedName = titleCase(
    expand(tokenize(desc))
      .filter((t) => t.length > 1)
      .join(" "),
  );

  if (!best) {
    return {
      rawLine: line,
      foodId: null,
      displayName: expandedName,
      quantity,
      unit,
      price,
      confidence: 0.3,
      category: guessCategory(expandedName),
    };
  }
  return {
    rawLine: line,
    foodId: best.foodId,
    displayName: expandedName,
    quantity,
    unit,
    price,
    confidence: Math.min(1, best.score),
  };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export interface ReceiptMeta {
  retailer: string | null;
  purchaseDate: string | null;
}

export function parseReceiptMeta(text: string): ReceiptMeta {
  const retailerMatch = text.match(/\b(Instacart|Amazon Fresh|Whole Foods|Walmart|DoorDash|Kroger|Target|Trader Joe'?s|Costco|Safeway|Wegmans|H-E-B|Publix)\b/i);
  const retailer = retailerMatch ? retailerMatch[1] : null;

  let purchaseDate: string | null = null;
  const numeric = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  const worded = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i);
  if (numeric) {
    const [, m, d, y] = numeric;
    purchaseDate = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  } else if (worded) {
    const [, mon, d, y] = worded;
    const mi = MONTHS.indexOf(mon.slice(0, 3).toLowerCase());
    if (mi >= 0) purchaseDate = `${y}-${String(mi + 1).padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return { retailer, purchaseDate };
}

/** Parse a whole receipt (email body or pasted text) into normalized lines. */
export function parseReceipt(text: string): { lines: ExtractedLine[]; meta: ReceiptMeta } {
  const meta = parseReceiptMeta(text);
  const lines: ExtractedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const parsed = normalizeLine(raw);
    if (!parsed) continue;
    // Header/footer chatter has no price and no recognisable food — drop it.
    if (parsed.price === 0 && parsed.confidence < 0.6) continue;
    lines.push(parsed);
  }
  return { lines, meta };
}
