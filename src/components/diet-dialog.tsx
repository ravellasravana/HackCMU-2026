"use client";

import { useState } from "react";
import { Leaf } from "lucide-react";
import { parseAllergies } from "@/lib/diet";
import type { DietPrefs } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diet: DietPrefs;
  onSave: (diet: DietPrefs) => void;
}

/** Filters both the recipe library and the K2 prompt — a rejected dinner never reaches the plan. */
export function DietDialog({ open, onOpenChange, diet, onSave }: Props) {
  const [vegetarian, setVegetarian] = useState(diet.vegetarian);
  const [allergyText, setAllergyText] = useState(diet.allergies.join(", "));

  function save() {
    onSave({ vegetarian, allergies: parseAllergies(allergyText) });
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setVegetarian(diet.vegetarian);
          setAllergyText(diet.allergies.join(", "));
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="size-4" /> Dinner preferences
          </DialogTitle>
          <DialogDescription>Applies to the recipe library and every IFM K2 dinner.</DialogDescription>
        </DialogHeader>

        <label className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm">
          Vegetarian
          <Switch checked={vegetarian} onCheckedChange={setVegetarian} />
        </label>

        <label className="space-y-1 text-xs text-muted-foreground">
          Allergies (comma-separated)
          <Input
            value={allergyText}
            onChange={(e) => setAllergyText(e.target.value)}
            placeholder="peanuts, shellfish"
          />
        </label>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
