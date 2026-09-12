/**
 * Models occasionally hand back JSON with a trailing comma, or get cut off mid-structure
 * when a large response (several full recipes) eats into the token budget. Strip trailing
 * commas before the closing bracket/brace — always safe, since valid JSON never has one —
 * and surface the raw text in the error when parsing still fails, so a truncation looks
 * like a truncation instead of a cryptic position number.
 */
export function parseModelJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const repaired = cleaned.replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(repaired) as T;
  } catch (err) {
    const truncated = repaired.length > 200 ? `${repaired.slice(0, 100)} …[${repaired.length} chars]… ${repaired.slice(-100)}` : repaired;
    throw new Error(`Model response was not valid JSON (${(err as Error).message}): ${truncated}`);
  }
}
