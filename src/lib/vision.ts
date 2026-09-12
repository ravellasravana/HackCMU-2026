"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { ImageLabeling } from "@capacitor-mlkit/image-labeling";
import { matchFood } from "./normalize";
import type { ExtractedLine } from "./types";

/**
 * "Take a photo of your fridge" — Google ML Kit's on-device Image Labeling
 * model, bundled inside the app. It's a general-purpose object/scene
 * classifier (not fine-tuned for groceries specifically), not a published
 * open-weight model, but it satisfies the thing that actually matters here:
 * everything runs locally on the phone. The photo is never uploaded, no
 * network call is made, and no API key is involved — see
 * https://developers.google.com/ml-kit/vision/image-labeling for the model.
 *
 * Because the label set is generic, most of what it returns for a fridge
 * photo isn't food at all ("Shelf", "Refrigerator", "Plastic", the
 * packaging, ...). Rather than filtering with a denylist, we only keep a
 * label if it actually matches something in the FoodKeeper table — anything
 * that doesn't is assumed to not be a grocery item.
 */
export function cameraSupported(): boolean {
  return Capacitor.isNativePlatform();
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function scanFridgePhoto(): Promise<ExtractedLine[]> {
  if (!cameraSupported()) throw new Error("Photo scanning needs the installed Android app.");

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    quality: 70,
    saveToGallery: false,
  });
  if (!photo.path) throw new Error("Couldn't access that photo.");

  const { labels } = await ImageLabeling.processImage({ path: photo.path, confidenceThreshold: 0.55 });
  if (!labels.length) throw new Error("Didn't recognize anything in that photo — try better lighting or a closer shot.");

  // Keep only the best-scoring line per food, in case multiple labels map to the same item.
  const best = new Map<string, ExtractedLine>();
  for (const label of labels) {
    const { best: match } = matchFood(label.text);
    if (!match) continue;
    // Combined confidence is the weaker of "ML Kit is sure this label applies"
    // and "this label text really means this FoodKeeper entry" — deliberately
    // conservative, since camera detection is the least reliable input method.
    const confidence = Math.min(1, match.score, label.confidence);
    const existing = best.get(match.foodId);
    if (existing && existing.confidence >= confidence) continue;
    best.set(match.foodId, {
      rawLine: `📷 detected "${label.text}"`,
      foodId: match.foodId,
      displayName: titleCase(label.text),
      quantity: 1,
      price: 0,
      confidence,
    });
  }

  const lines = [...best.values()];
  if (!lines.length) throw new Error("Didn't recognize any specific foods in that photo — try adding them by hand instead.");
  return lines;
}
