"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Plus, X } from "lucide-react";
import type { ScannedItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "cn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (items: ScannedItem[]) => void;
}

interface Found extends ScannedItem {
  key: string;
  selected: boolean;
}

function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 1) return "border-rose-400/40 bg-rose-400/10 text-rose-200";
  if (daysLeft <= 3) return "border-amber-400/40 bg-amber-400/10 text-amber-200";
  return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read that photo."));
    reader.readAsDataURL(file);
  });
}

const MAX_DIMENSION = 1280;

/**
 * A real phone camera photo is routinely 3-10MB at full resolution — fine on a laptop's
 * dev server, but slow (or outright rejected by some hosts' body-size limits) over a phone's
 * cellular or venue WiFi. Downscale to a long edge of 1280px and re-encode as JPEG before
 * it ever leaves the device; Gemini needs enough resolution to read condition and text, not
 * the original megapixel count. Falls back to the raw file if canvas encoding fails for any
 * reason, so a device without canvas support still gets a working (just slower) upload.
 */
async function resizeForUpload(file: File): Promise<string> {
  try {
    const original = await readAsDataURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Couldn't decode that image."));
      el.src = original;
    });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    if (scale >= 1) return original; // already small enough
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return readAsDataURL(file);
  }
}

/**
 * Camera-scan a fridge/counter/leftovers photo. Deliberately built on a plain file input with
 * capture="environment" rather than a live getUserMedia preview: the latter needs HTTPS or
 * localhost, and a plain-HTTP Vultr deploy would silently break it. This still opens the
 * phone's native camera directly, and supports scanning several photos in one session so it
 * reads as an ongoing scan of the fridge, not a single upload.
 */
export function ScanDialog({ open, onOpenChange, onAdd }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<Found[]>([]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeForUpload(file);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await res.json()) as { items?: ScannedItem[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Scan failed (${res.status})`);
      const next: Found[] = (data.items ?? []).map((i, idx) => ({
        ...i,
        key: `${Date.now()}-${idx}`,
        selected: true,
      }));
      setFound((prev) => [...prev, ...next]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function toggle(key: string) {
    setFound((prev) => prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f)));
  }

  function addSelected() {
    const selected = found.filter((f) => f.selected);
    if (selected.length) onAdd(selected);
    setFound([]);
    setError(null);
    onOpenChange(false);
  }

  const selectedCount = found.filter((f) => f.selected).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setFound([]);
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="size-4" /> Scan your fridge
          </DialogTitle>
          <DialogDescription>
            Photograph a shelf, a container of leftovers, or meal-prepped food. AI reads freshness straight from
            the photo, no receipt needed. Scan as many photos as you want before adding.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        <Button
          variant="outline"
          size="lg"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full"
        >
          {busy ? <Loader2 className="animate-spin" /> : <Camera />}
          {busy ? "Reading the photo…" : found.length ? "Scan another photo" : "Take or upload a photo"}
        </Button>

        {error && (
          <p className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">{error}</p>
        )}

        {found.length > 0 && (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {found.map((f) => (
              <li key={f.key}>
                <button
                  type="button"
                  onClick={() => toggle(f.key)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-opacity",
                    f.selected ? "border-white/15 bg-white/5" : "border-white/5 opacity-40",
                  )}
                >
                  <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border", f.selected ? "border-primary bg-primary/20" : "border-white/20")}>
                    {f.selected && <Plus className="size-3.5 rotate-45" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{f.name}</span>
                      <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-medium", urgencyColor(f.daysLeft))}>
                        {f.daysLeft === 0 ? "eat today" : `${f.daysLeft}d left`}
                      </span>
                      {!f.foodId && (
                        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] text-sky-200">new food</span>
                      )}
                    </div>
                    {f.condition && <div className="mt-0.5 text-xs text-muted-foreground">{f.condition}</div>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {found.length ? `${selectedCount} of ${found.length} selected` : "AI's visual read, not a food-safety guarantee — use judgment."}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X /> Close
            </Button>
            <Button size="sm" onClick={addSelected} disabled={!selectedCount}>
              Add {selectedCount || ""} to fridge
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
