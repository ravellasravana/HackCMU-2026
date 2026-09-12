"use client";

import { useState } from "react";
import { Camera as CameraIcon, Loader2, Mic, Plus } from "lucide-react";
import { todayISO } from "@/lib/dates";
import { listenOnce, parseSpokenGroceries, speechSupported } from "@/lib/speech";
import type { ExtractResult } from "@/lib/types";
import { cameraSupported, scanFridgePhoto } from "@/lib/vision";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onAdd: (text: string) => string | null;
  onExtracted: (result: ExtractResult) => void;
}

export function AddItem({ onAdd, onExtracted }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"voice" | "photo" | null>(null);

  function submit() {
    const err = onAdd(text);
    if (err) {
      setError(err);
      return;
    }
    setText("");
    setError(null);
  }

  async function handleVoice() {
    setError(null);
    setBusy("voice");
    try {
      const transcript = await listenOnce();
      const lines = parseSpokenGroceries(transcript);
      if (!lines.length) throw new Error(`Heard "${transcript}" but couldn't pick out any foods — try again.`);
      onExtracted({ lines, meta: { retailer: null, purchaseDate: null }, source: "voice", fallbackDate: todayISO() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function handlePhoto() {
    setError(null);
    setBusy("photo");
    try {
      const lines = await scanFridgePhoto();
      onExtracted({ lines, meta: { retailer: null, purchaseDate: null }, source: "photo", fallbackDate: todayISO() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-1">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Add something you bought this week — “avocados”, “2 lb chicken thighs $9.49”"
          aria-label="Add an item"
          className="h-9"
        />
        <Button type="submit" size="lg" disabled={!text.trim()}>
          <Plus /> Add
        </Button>
        {speechSupported() && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handleVoice}
            disabled={busy !== null}
            aria-label="Say what you bought"
            title="Say what you bought"
          >
            {busy === "voice" ? <Loader2 className="animate-spin" /> : <Mic />}
          </Button>
        )}
        {cameraSupported() && (
          <Button
            type="button"
            size="lg"
            variant="outline"
            onClick={handlePhoto}
            disabled={busy !== null}
            aria-label="Scan a photo of your fridge"
            title="Scan a photo of your fridge"
          >
            {busy === "photo" ? <Loader2 className="animate-spin" /> : <CameraIcon />}
          </Button>
        )}
      </form>
      {error && <p className="px-1 text-xs text-rose-300">{error}</p>}
      {busy === "voice" && <p className="px-1 text-xs text-muted-foreground">Listening…</p>}
      {busy === "photo" && <p className="px-1 text-xs text-muted-foreground">Scanning the photo on-device — nothing leaves your phone…</p>}
    </div>
  );
}
