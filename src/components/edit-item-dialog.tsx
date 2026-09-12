"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  item: InventoryItem | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<InventoryItem>) => void;
}

function EditItemForm({ item, onClose, onSave }: { item: InventoryItem; onClose: () => void; onSave: Props["onSave"] }) {
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [price, setPrice] = useState(item.price.toFixed(2));
  const [purchaseDate, setPurchaseDate] = useState(item.purchaseDate);

  function save() {
    const q = Number(quantity);
    const p = Number(price);
    onSave(item.id, {
      quantity: Number.isFinite(q) && q > 0 ? q : item.quantity,
      price: Number.isFinite(p) && p >= 0 ? p : item.price,
      purchaseDate: purchaseDate || item.purchaseDate,
    });
    onClose();
  }

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Pencil className="size-4" /> Edit {item.displayName}
        </DialogTitle>
        <DialogDescription>Fix a bad guess from the receipt scan.</DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          Quantity
          <Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Price ($)
          <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label className="col-span-2 space-y-1 text-xs text-muted-foreground">
          Purchase date
          <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
      </div>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={save}>
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

/** Fix a bad price/date/quantity guess without deleting and retyping the item. */
export function EditItemDialog({ item, onClose, onSave }: Props) {
  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && onClose()}>
      {item && <EditItemForm key={item.id} item={item} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}
