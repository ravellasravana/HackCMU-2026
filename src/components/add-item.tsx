"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Plus, Square, X } from "lucide-react";
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
}

type ModelState = "checking" | "needed" | "downloading" | "ready";

export function AddItem({ onAdd, onExtracted }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [modelState, setModelState] = useState<ModelState>("checking");
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; message: string } | null>(null);
  const [session, setSession] = useState<ListeningSession | null>(null);
  const [liveText, setLiveText] = useState("");
  const [pendingLines, setPendingLines] = useState<ExtractedLine[]>([]);

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
    setPendingLines((prev) => [...prev, ...lines]);
  }

  async function handleMicClick() {
    setError(null);
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

  function removePending(index: number) {
    setPendingLines((prev) => prev.filter((_, i) => i !== index));
  }

  function addPending() {
    onExtracted({ lines: pendingLines, meta: { retailer: null, purchaseDate: null }, source: "voice", fallbackDate: todayISO() });
    setPendingLines([]);
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

      {pendingLines.length > 0 && (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-muted-foreground">Heard {pendingLines.length} {pendingLines.length === 1 ? "item" : "items"} — remove anything wrong, then add:</p>
          <ul className="flex flex-wrap gap-1.5">
            {pendingLines.map((line, i) => {
              const food = line.foodId ? FOOD_BY_ID[line.foodId] : undefined;
              return (
                <li
                  key={i}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-card py-1 pl-2.5 pr-1.5 text-xs"
                >
                  <span aria-hidden>{food?.emoji ?? "❓"}</span>
                  <span>{food?.name ?? line.displayName}</span>
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="rounded-full p-0.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    aria-label={`Remove ${food?.name ?? line.displayName}`}
                  >
                    <X className="size-3" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setPendingLines([])}>
              Discard
            </Button>
            <Button type="button" size="sm" onClick={addPending}>
              Add {pendingLines.length} {pendingLines.length === 1 ? "item" : "items"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
