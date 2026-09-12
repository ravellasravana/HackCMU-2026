"use client";

import { Capacitor } from "@capacitor/core";
import { OfflineSpeechRecognition, type RecognitionResult } from "capacitor-offline-speech-recognition";
import { normalizeLine } from "./normalize";
import type { ExtractedLine } from "./types";

/**
 * "Tell the app what you bought" — speech-to-text via Vosk
 * (https://alphacephei.com/vosk/), a genuinely open-source (Apache 2.0),
 * open-weight recognition engine bundled into the app natively (not
 * Android's stock SpeechRecognizer, which is typically Google's proprietary
 * *online* recognizer). Recognition itself runs entirely on-device — audio
 * never leaves the phone. The one exception: the ~50MB acoustic model has to
 * be downloaded once, the first time voice input is used (there's no way to
 * ship it pre-bundled with this plugin without patching its native source);
 * after that one-time download it's cached on-device and every subsequent
 * use is fully offline.
 *
 * Unlike Android's stock recognizer (which stops listening after a ~1-2s
 * pause — a bad fit for reading off a grocery list), this engine streams
 * raw audio through Vosk continuously until the caller explicitly stops it,
 * so a natural pause between "milk" and "eggs" doesn't cut anything off.
 */

const LANGUAGE = "en-us";

export function speechSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export async function isModelDownloaded(): Promise<boolean> {
  const { models } = await OfflineSpeechRecognition.getDownloadedLanguageModels();
  return models.some((m) => m.language === LANGUAGE);
}

/** Downloads the ~50MB Vosk English model. One-time; needs internet only for this step. */
export async function downloadModel(onProgress: (percent: number, message: string) => void): Promise<void> {
  const handle = await OfflineSpeechRecognition.addListener("downloadProgress", (p) => onProgress(p.progress, p.message));
  try {
    const result = await OfflineSpeechRecognition.downloadLanguageModel({ language: LANGUAGE });
    if (!result.success) throw new Error(result.message ?? "Model download failed.");
  } finally {
    await handle.remove();
  }
}

export interface ListeningSession {
  /** Stops listening and resolves with everything recognized during the session. */
  stop: () => Promise<string>;
}

/**
 * Starts continuous listening. Call `stop()` on the returned handle when the
 * user is done talking — there's no automatic silence cutoff.
 */
export async function startListening(onPartial: (text: string) => void): Promise<ListeningSession> {
  if (!speechSupported()) throw new Error("Voice input needs the installed Android app.");
  if (!(await isModelDownloaded())) throw new Error("The offline voice model hasn't been downloaded yet.");

  const finalChunks: string[] = [];
  let latestPartial = "";
  const handle = await OfflineSpeechRecognition.addListener("recognitionResult", (result: RecognitionResult) => {
    if (result.isFinal) {
      if (result.text.trim()) finalChunks.push(result.text.trim());
      latestPartial = "";
    } else {
      latestPartial = result.text;
    }
    onPartial([...finalChunks, latestPartial].filter(Boolean).join(" "));
  });

  await OfflineSpeechRecognition.startRecognition({ language: LANGUAGE });

  return {
    stop: async () => {
      await OfflineSpeechRecognition.stopRecognition();
      await handle.remove();
      if (latestPartial.trim()) finalChunks.push(latestPartial.trim());
      return finalChunks.join(" ");
    },
  };
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

/** Full pipeline: a spoken sentence (however many items it contains) → normalized, FoodKeeper-matched line items. */
export function parseSpokenGroceries(text: string): ExtractedLine[] {
  const lines: ExtractedLine[] = [];
  for (const fragment of splitSpokenGroceries(text)) {
    const line = normalizeLine(fragment);
    if (line) lines.push(line);
  }
  return lines;
}
