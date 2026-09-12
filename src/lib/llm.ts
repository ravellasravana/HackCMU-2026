import "server-only";
import { k2Configured, k2Json } from "./k2";

export type LlmProvider = "k2" | "gemini";

function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Which provider actually answers a call right now. Defaults to K2 (the IFM prize path)
 * so adding Gemini support never silently changes existing IFM K2 behavior; set
 * LLM_PROVIDER=gemini explicitly to prefer Gemini when both keys are present.
 */
export function activeProvider(): LlmProvider | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced === "gemini" && geminiConfigured()) return "gemini";
  if (forced === "k2" && k2Configured()) return "k2";
  if (k2Configured()) return "k2";
  if (geminiConfigured()) return "gemini";
  return null;
}

export function llmConfigured(): boolean {
  return activeProvider() !== null;
}

/** Gemini's OpenAI-compatible endpoint accepts the same chat-completions shape K2 does. */
async function geminiJson<T>(prompt: string, { maxTokens = 2500 }: { maxTokens?: number }): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const baseUrl = (process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  const model = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You return strictly valid JSON and nothing else." },
        { role: "user", content: prompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned) as T;
}

/** Routes to whichever provider is configured; callers get back which one actually ran. */
export async function llmJson<T>(prompt: string, opts: { maxTokens?: number } = {}): Promise<{ data: T; provider: LlmProvider }> {
  const provider = activeProvider();
  if (!provider) throw new Error("No LLM configured (set K2_API_KEY or GEMINI_API_KEY)");
  const data = provider === "gemini" ? await geminiJson<T>(prompt, opts) : await k2Json<T>(prompt, opts);
  return { data, provider };
}
