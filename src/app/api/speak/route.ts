/**
 * POST { text } → audio/mpeg
 * Proxies ElevenLabs text-to-speech so the API key never reaches the browser.
 */
export async function POST(request: Request) {
  let text = "";
  try {
    const body = (await request.json()) as { text?: string };
    text = (body.text ?? "").trim();
  } catch {
    return Response.json({ error: "Body must be JSON with a `text` field." }, { status: 400 });
  }
  if (!text) return Response.json({ error: "Nothing to say." }, { status: 400 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return Response.json({ error: "ELEVENLABS_API_KEY is not set." }, { status: 501 });
  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "audio/mpeg",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 2000),
        model_id: "eleven_turbo_v2_5",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return Response.json({ error: `ElevenLabs request failed (${res.status}): ${body.slice(0, 300)}` }, { status: 502 });
    }
    return new Response(res.body, { headers: { "content-type": "audio/mpeg" } });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
