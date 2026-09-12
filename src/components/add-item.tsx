"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onAdd: (text: string) => string | null;
  /** Focus the text field immediately — used wherever this is the primary action on screen. */
  autoFocus?: boolean;
}

export function AddItem({ onAdd, autoFocus }: Props) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const err = onAdd(text);
    if (err) {
      setError(err);
      return;
    }
    setText("");
    setError(null);
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
          autoFocus={autoFocus}
        />
        <Button type="submit" size="lg" disabled={!text.trim()}>
          <Plus /> Add
        </Button>
      </form>
      {error && <p className="px-1 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
