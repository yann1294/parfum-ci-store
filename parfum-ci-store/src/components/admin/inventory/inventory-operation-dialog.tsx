"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { adjustInventoryFromForm } from "@/app/admin/inventaire/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryVariantRow, ManualInventoryOperationType } from "@/lib/inventory/admin";

function createInventoryIdempotencyKey() {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  const entropy = [...random].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `inventory-${crypto.randomUUID()}-${entropy}`;
}

function requiresReason(operation: ManualInventoryOperationType) {
  return operation === "INITIALIZE" || operation === "DAMAGED" || operation === "ADJUSTMENT" || operation === "RETURNED";
}

export function InventoryOperationDialog({ variant }: { variant: InventoryVariantRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [operationType, setOperationType] = useState<ManualInventoryOperationType>(
    variant.stockInitialized ? "RECEIVED" : "INITIALIZE",
  );
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">("INCREASE");
  const [quantity, setQuantity] = useState("0");
  const [idempotencyKey, setIdempotencyKey] = useState(() => createInventoryIdempotencyKey());

  const quantityValue = Number.parseInt(quantity || "0", 10) || 0;
  const delta = useMemo(() => {
    if (operationType === "DAMAGED") return -quantityValue;
    if (operationType === "ADJUSTMENT" && direction === "DECREASE") return -quantityValue;
    if (operationType === "INITIALIZE") return quantityValue - variant.stockOnHand;
    return quantityValue;
  }, [direction, operationType, quantityValue, variant.stockOnHand]);
  const predictedStock = operationType === "INITIALIZE" ? quantityValue : variant.stockOnHand + delta;
  const violatesReserved = predictedStock < variant.reservedQuantity;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setIdempotencyKey(createInventoryIdempotencyKey());
      setOperationType(variant.stockInitialized ? "RECEIVED" : "INITIALIZE");
      setQuantity(variant.stockInitialized ? "1" : "0");
    }
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await adjustInventoryFromForm(variant.variantId, formData);
      if (result.ok) {
        toast.success("Inventaire mis à jour");
        setOpen(false);
        setIdempotencyKey(createInventoryIdempotencyKey());
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type="button" />}>
        {variant.stockInitialized ? "Nouvelle opération" : "Initialiser le stock"}
      </DialogTrigger>
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opération d&apos;inventaire</DialogTitle>
          <DialogDescription>
            Les mouvements sont transactionnels et le stock réservé n&apos;est jamais modifié manuellement.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className="grid gap-2">
            <Label htmlFor="operationType">Opération</Label>
            <select
              id="operationType"
              name="operationType"
              value={operationType}
              onChange={(event) => setOperationType(event.currentTarget.value as ManualInventoryOperationType)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              {!variant.stockInitialized ? <option value="INITIALIZE">Initialiser le stock</option> : null}
              {variant.stockInitialized ? <option value="RECEIVED">Réception</option> : null}
              {variant.stockInitialized ? <option value="DAMAGED">Endommagé</option> : null}
              {variant.stockInitialized ? <option value="ADJUSTMENT">Correction</option> : null}
              {variant.stockInitialized ? <option value="RETURNED">Retour revendable</option> : null}
            </select>
          </div>

          {operationType === "ADJUSTMENT" ? (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Sens de correction</legend>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="adjustmentDirection"
                    value="INCREASE"
                    checked={direction === "INCREASE"}
                    onChange={() => setDirection("INCREASE")}
                  />
                  Augmenter
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="adjustmentDirection"
                    value="DECREASE"
                    checked={direction === "DECREASE"}
                    onChange={() => setDirection("DECREASE")}
                  />
                  Diminuer
                </label>
              </div>
            </fieldset>
          ) : (
            <input type="hidden" name="adjustmentDirection" value={direction} />
          )}

          <div className="grid gap-2">
            <Label htmlFor="quantity">{operationType === "INITIALIZE" ? "Stock initial" : "Quantité"}</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={operationType === "INITIALIZE" ? 0 : 1}
              value={quantity}
              onChange={(event) => setQuantity(event.currentTarget.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reason">Motif{requiresReason(operationType) ? "" : " recommandé"}</Label>
            <Textarea
              id="reason"
              name="reason"
              required={requiresReason(operationType)}
              defaultValue={operationType === "INITIALIZE" ? "Stock initial à la création de la variante" : ""}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reference">Référence interne sûre</Label>
            <Input id="reference" name="reference" maxLength={120} />
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p>Stock physique actuel: {variant.stockOnHand}</p>
            <p>Stock réservé: {variant.reservedQuantity}</p>
            <p>Stock physique prévu: {Number.isFinite(predictedStock) ? predictedStock : variant.stockOnHand}</p>
            <p>Disponible prévu: {Math.max((Number.isFinite(predictedStock) ? predictedStock : variant.stockOnHand) - variant.reservedQuantity, 0)}</p>
            {violatesReserved ? (
              <p className="mt-2 font-medium text-destructive">
                Cette opération ferait passer le stock sous la quantité réservée.
              </p>
            ) : null}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required />
            Je confirme que ce mouvement est correct et doit être inscrit au ledger.
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending || violatesReserved}>
              {pending ? "Enregistrement..." : "Enregistrer l'opération"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
