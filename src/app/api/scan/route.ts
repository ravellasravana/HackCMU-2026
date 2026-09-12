import { FOOD_BY_ID } from "@/lib/foodkeeper";
import { geminiConfigured, geminiVisionJson } from "@/lib/llm";
import { photoScanPrompt } from "@/lib/prompts";
import type { Category, ScannedItem } from "@/lib/types";

interface ScanResult {
  items: {
    name: string;
    canonical: string | null;
    category: Category;
    condition: string;
    estimated_days_left: number;
    confidence: number;
  }[];
}

/**
 * POST { image: "data:image/...;base64,..." } → { items: ScannedItem[] }
 * Gemini-only: reads a fridge/counter/leftovers photo and judges shelf life directly from
 * what it sees, rather than assuming a fixed shelf life from a purchase date. Covers home-cooked
 * or mixed dishes a grocery receipt could never capture.
 */
export async function POST(request: Request) {
  let image = "";
  try {
    const body = (await request.json()) as { image?: string };
    image = body.image ?? "";
  } catch {
    return Response.json({ error: "Body must be JSON with an `image` field." }, { status: 400 });
  }
  if (!image.startsWith("data:image/")) {
    return Response.json({ error: "Expected a data URL (data:image/...;base64,...)." }, { status: 400 });
  }
  if (!geminiConfigured()) {
    return Response.json({ error: "GEMINI_API_KEY is not set — photo scanning needs Gemini specifically." }, { status: 501 });
  }

  try {
    const result = await geminiVisionJson<ScanResult>(photoScanPrompt(), image, { maxTokens: 4000 });
    const items: ScannedItem[] = (result.items ?? [])
      .filter((i) => i && typeof i.name === "string")
      .map((i) => ({
        name: i.name,
        foodId: i.canonical && FOOD_BY_ID[i.canonical] ? i.canonical : null,
        category: i.category ?? "produce",
        condition: i.condition ?? "",
        daysLeft: Math.max(0, Math.round(Number(i.estimated_days_left) || 0)),
        confidence: Math.max(0, Math.min(1, Number(i.confidence) || 0)),
      }));
    if (!items.length) return Response.json({ error: "Couldn't make out any food in that photo — try getting closer with better light." }, { status: 422 });
    return Response.json({ items });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
