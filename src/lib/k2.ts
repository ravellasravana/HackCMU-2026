import "server-only";
import { parseModelJson } from "./jsonRepair";

/**
 * Minimal OpenAI-compatible chat client for Kimi K2.
 * Works against Moonshot directly or via OpenRouter — set K2_BASE_URL / K2_MODEL accordingly.
 */
export function k2Configured(): boolean {
  return Boolean(process.env.K2_API_KEY);
}

export async function k2Json<T>(prompt: string, { maxTokens = 2500 }: { maxTokens?: number } = {}): Promise<T> {
  const apiKey = process.env.K2_API_KEY;
  if (!apiKey) throw new Error("K2_API_KEY is not set");
  const baseUrl = (process.env.K2_BASE_URL ?? "https://api.ifm.ai/v1").replace(/\/$/, "");
  const model = process.env.K2_MODEL ?? "IFM/K2-Horizon-375B-A23B";

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
    throw new Error(`K2 request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseModelJson<T>(content);
}
