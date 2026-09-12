"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Plus, Square } from "lucide-react";
import { todayISO } from "@/lib/dates";
import { FOOD_BY_ID } from "@/lib/foodkeeper";
import {
  downloadModel,
  isModelDownloaded,
  parseSpokenGroceries,
  speechSupported,
  startListening,
  type ListeningSession,
} from "@/lib/speech";
import type { ExtractedLine, ExtractResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onAdd: (text: string) => string | null;
  onExtracted: (result: ExtractResult) => void;
  /** Focus the text field immediately — used on the first-run screen, where this *is* the whole UI. */
  autoFocus?: boolean;
}

type ModelState = "checking" | "needed" | "downloading" | "ready";

/** How long the "✓ Added: ..." confirmation stays up after a voice add. */
const JUST_ADDED_MS = 4000;

export function AddItem({ onAdd, onExtracted, autoFocus }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [modelState, setModelState] = useState<ModelState>("checking");
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; message: string } | null>(null);
  const [session, setSession] = useState<ListeningSession | null>(null);
  const [liveText, setLiveText] = useState("");
  const [justAdded, setJustAdded] = useState<ExtractedLine[]>([]);

  useEffect(() => {
    if (!speechSupported()) return;
    isModelDownloaded().then((yes) => setModelState(yes ? "ready" : "needed"));
  }, []);

  function submit() {
    const err = onAdd(text);
    if (err) {
      setError(err);
      return;
    }
    setText("");
    setError(null);
  }

  async function handleDownloadModel() {
    setError(null);
    setModelState("downloading");
    setDownloadProgress({ percent: 0, message: "Starting…" });
    try {
      await downloadModel((percent, message) => setDownloadProgress({ percent, message }));
      setModelState("ready");
      setDownloadProgress(null);
      await beginListening();
    } catch (err) {
      setError((err as Error).message);
      setModelState("needed");
      setDownloadProgress(null);
    }
  }

  async function beginListening() {
    try {
      const s = await startListening((text) => setLiveText(text));
      setSession(s);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function stopListening() {
    if (!session) return;
    const transcript = await session.stop();
    setSession(null);
    setLiveText("");
    const lines = parseSpokenGroceries(transcript);
    if (!lines.length) {
      setError(transcript ? `Heard "${transcript}" but couldn't pick out any foods.` : "Didn't catch anything — try again.");
      return;
    }
    // Straight to the fridge — no extra "review, then add" tap. Anything the
    // matcher wasn't sure about still gets the same amber confirm chip a
    // pasted receipt line would.
    onExtracted({ lines, meta: { retailer: null, purchaseDate: null }, source: "voice", fallbackDate: todayISO() });
    setJustAdded(lines);
    window.setTimeout(() => setJustAdded((prev) => (prev === lines ? [] : prev)), JUST_ADDED_MS);
  }

  async function handleMicClick() {
    setError(null);
    setJustAdded([]);
    if (session) {
      await stopListening();
      return;
    }
    if (modelState === "needed") {
      await handleDownloadModel();
      return;
    }
    if (modelState === "ready") await beginListening();
  }

  return (
    <div className="space-y-2">
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
          autoFocus={autoFocus}
        />
        <Button type="submit" size="lg" disabled={!text.trim()}>
          <Plus /> Add
        </Button>
        {speechSupported() && (
          <Button
            type="button"
            size="lg"
            variant={session ? "default" : "outline"}
            onClick={handleMicClick}
            disabled={modelState === "checking" || modelState === "downloading"}
            aria-label={session ? "Stop listening" : "Say what you bought"}
            title={session ? "Stop listening" : "Say what you bought — open-source Vosk speech recognition, runs on-device"}
          >
            {modelState === "checking" || modelState === "downloading" ? (
              <Loader2 className="animate-spin" />
            ) : session ? (
              <Square className="fill-current" />
            ) : (
              <Mic />
            )}
          </Button>
        )}
      </form>

      {error && <p className="px-1 text-xs text-rose-300">{error}</p>}

      {modelState === "downloading" && downloadProgress && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            Downloading the offline voice model (one-time, ~50MB) — {downloadProgress.message} {Math.round(downloadProgress.percent)}%
          </p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${downloadProgress.percent}%` }} />
          </div>
        </div>
      )}

      {session && (
        <p className="flex items-center gap-2 px-1 text-xs text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          Listening — say everything you bought, then tap stop.{" "}
          {liveText && <span className="italic text-muted-foreground">&ldquo;{liveText}&rdquo;</span>}
        </p>
      )}

      {justAdded.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-emerald-300">
          <span aria-hidden>✓</span> Added:
          {justAdded.map((line, i) => {
            const food = line.foodId ? FOOD_BY_ID[line.foodId] : undefined;
            return (
              <span key={i} className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5">
                <span aria-hidden>{food?.emoji ?? "❓"}</span>
                {food?.name ?? line.displayName}
              </span>
            );
          })}
          <span className="text-muted-foreground">— see them in the timeline below.</span>
        </p>
      )}
    </div>
  );
}
