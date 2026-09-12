import { FOOD_BY_ID } from "@/lib/foodkeeper";
import { k2Configured, k2Json } from "@/lib/k2";
import { matchFood, parseReceipt } from "@/lib/normalize";
import { extractionPrompt } from "@/lib/prompts";
import type { Category, ExtractedLine } from "@/lib/types";

interface K2Extraction {
  retailer: string | null;
  purchase_date: string | null;
  items: {
    raw_line: string;
    name: string;
    canonical: string | null;
    category: Category;
    quantity: number;
    unit: string | null;
    price: number;
    confidence: number;
  }[];
}

/**
 * POST { text } → { lines, meta, source }
 * Uses Kimi K2 when K2_API_KEY is set; otherwise the deterministic local normalizer.
 * K2 output is validated against the FoodKeeper table so a bad canonical id can't leak through.
 */
export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return Response.json({ error: "Body must be JSON with a `text` field." }, { status: 400 });
  }
  if (!text) return Response.json({ error: "Paste a receipt first." }, { status: 400 });

  const local = parseReceipt(text);

  if (!k2Configured()) {
    return Response.json({ ...local, source: "local" });
  }

  try {
    const k2 = await k2Json<K2Extraction>(extractionPrompt(text), { maxTokens: 3000 });
    const lines: ExtractedLine[] = [];
    for (const item of k2.items ?? []) {
      let foodId = item.canonical && FOOD_BY_ID[item.canonical] ? item.canonical : null;
      let confidence = Math.max(0, Math.min(1, Number(item.confidence) || 0));
      if (!foodId) {
        const { best } = matchFood(item.name || item.raw_line);
        if (best) {
          foodId = best.foodId;
          confidence = Math.min(confidence || best.score, best.score);
        }
      }
      lines.push({
        rawLine: item.raw_line || item.name,
        foodId,
        displayName: item.name || item.raw_line,
        quantity: Number(item.quantity) || 1,
        unit: item.unit ?? undefined,
        price: Number(item.price) || 0,
        confidence,
        category: item.category,
      });
    }
    if (!lines.length) throw new Error("K2 returned no items");
    return Response.json({
      lines,
      meta: {
        retailer: k2.retailer ?? local.meta.retailer,
        purchaseDate: k2.purchase_date ?? local.meta.purchaseDate,
      },
      source: "k2",
    });
  } catch (err) {
    return Response.json({
      ...local,
      source: "local",
      warning: `K2 extraction failed, fell back to the local normalizer: ${(err as Error).message}`,
    });
  }
}
