"use client";

import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { normalizeLine } from "./normalize";
import type { ExtractedLine } from "./types";

/**
 * "Tell the app what you bought" — native speech-to-text (Android's built-in
 * recognizer, via @capacitor-community/speech-recognition), then the same
 * deterministic text parser the receipt/manual-add flows already use. No
 * network call and no API key: recognition runs through the OS, and parsing
 * is local pattern matching against the FoodKeeper table (src/lib/normalize.ts).
 */
export function speechSupported(): boolean {
  return Capacitor.isNativePlatform();
}

async function ensurePermission(): Promise<void> {
  const status = await SpeechRecognition.checkPermissions();
  if (status.speechRecognition === "granted") return;
  const req = await SpeechRecognition.requestPermissions();
  if (req.speechRecognition !== "granted") throw new Error("Microphone permission was denied.");
}

/** Opens the native "listening…" popup, waits for one utterance, returns the raw transcript. */
export async function listenOnce(): Promise<string> {
  if (!speechSupported()) throw new Error("Voice input needs the installed Android app.");
  const { available } = await SpeechRecognition.available();
  if (!available) throw new Error("Speech recognition isn't available on this device.");
  await ensurePermission();
  const { matches } = await SpeechRecognition.start({
    language: "en-US",
    maxResults: 1,
    prompt: "Say what you bought…",
    popup: true,
  });
  const text = matches?.[0]?.trim();
  if (!text) throw new Error("Didn't catch that — try again.");
  return text;
}

const FILLER_PREFIX =
  /^\s*(i |we |just |also |then |so |okay |ok )*\b(bought|got|grabbed|picked up|have|add|added|buying|need to add)\b\s*/i;
const LEADING_QUANTITY_WORDS = /^\s*(some|a|an|the|few|couple(?: of)?|one|two|three|four|five|six)\s+/i;

/** "I bought milk, eggs, and some avocados" → one fragment per item. */
export function splitSpokenGroceries(text: string): string[] {
  const cleaned = text.toLowerCase().replace(FILLER_PREFIX, "");
  return cleaned
    .split(/,| and |\n/)
    .map((s) => s.replace(LEADING_QUANTITY_WORDS, "").trim())
    .filter((s) => s.length > 1);
}

/** Full pipeline: a spoken sentence → normalized, FoodKeeper-matched line items. */
export function parseSpokenGroceries(text: string): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  for (const fragment of splitSpokenGroceries(text)) {
    const line = normalizeLine(fragment);
    if (line) lines.push(line);
  }
  return lines;
}
