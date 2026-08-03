"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  addInternalOrderNoteFromForm,
  transitionOrderFromForm,
  updatePaymentStatusFromForm,
} from "@/app/admin/commandes/actions";
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
import { orderStatusLabel, paymentStatusLabel } from "@/lib/orders/display";
import type { Database } from "@/types/database.types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

function createActionIdempotencyKey(prefix: string) {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  const entropy = [...random].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}-${crypto.randomUUID()}-${entropy}`;
}

function transitionActionLabel(status: OrderStatus) {
  return {
    CONFIRMED: "Confirmer la commande",
    PREPARING: "Commencer la préparation",
    READY_FOR_PICKUP: "Marquer prête à récupérer",
    OUT_FOR_DELIVERY: "Marquer en livraison",
    DELIVERED: "Marquer livrée",
    CANCELLED: "Annuler la commande",
    RETURNED: "Marquer retournée",
    PENDING_CONFIRMATION: "En attente",
  }[status];
}

export function OrderTransitionDialog({
  orderId,
  targetStatus,
  currentStatus,
  itemCount,
  reservedQuantity,
}: {
  orderId: string;
  targetStatus: OrderStatus;
  currentStatus: OrderStatus;
  itemCount: number;
  reservedQuantity: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [idempotencyKey, setIdempotencyKey] = useState(() => createActionIdempotencyKey("order-transition"));
  const requiresReason = targetStatus === "CANCELLED" || targetStatus === "RETURNED";
  const destructive = targetStatus === "CANCELLED";

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setIdempotencyKey(createActionIdempotencyKey("order-transition"));
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await transitionOrderFromForm(orderId, formData);
      if (result.ok) {
        toast.success("Statut de commande mis à jour");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" variant={destructive ? "destructive" : "outline"} />}>
        {transitionActionLabel(targetStatus)}
      </DialogTrigger>
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{transitionActionLabel(targetStatus)}</DialogTitle>
          <DialogDescription>
            La transition est transactionnelle. Les effets stock éventuels sont appliqués dans la même opération.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          <input type="hidden" name="targetStatus" value={targetStatus} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p>Statut actuel: {orderStatusLabel(currentStatus)}</p>
            <p>Nouveau statut: {orderStatusLabel(targetStatus)}</p>
            <p>Articles concernés: {itemCount}</p>
            {targetStatus === "CANCELLED" ? <p>Stock réservé libéré: {reservedQuantity}</p> : null}
            {targetStatus === "DELIVERED" ? <p>Conversion attendue: réservation → vente, sans changer la disponibilité.</p> : null}
            {targetStatus === "RETURNED" ? (
              <p>Le retour de la commande ne remet pas automatiquement les articles en stock.</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`reason-${targetStatus}`}>Motif{requiresReason ? "" : " recommandé"}</Label>
            <Textarea id={`reason-${targetStatus}`} name="reason" required={requiresReason} maxLength={300} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`note-${targetStatus}`}>Note opérationnelle</Label>
            <Textarea id={`note-${targetStatus}`} name="note" maxLength={500} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required />
            Je confirme cette action sur la commande.
          </label>
          <div className="flex justify-end">
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending ? "Enregistrement..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentStatusDialog({
  orderId,
  targetPaymentStatus = "PAID",
  paymentMethod,
}: {
  orderId: string;
  targetPaymentStatus?: Extract<PaymentStatus, "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED">;
  paymentMethod: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [idempotencyKey, setIdempotencyKey] = useState(() => createActionIdempotencyKey("payment-status"));
  const manualReferenceRecommended = ["ORANGE_MONEY", "MTN_MOMO", "WAVE", "MOOV_MONEY", "BANK_TRANSFER"].includes(paymentMethod);

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) setIdempotencyKey(createActionIdempotencyKey("payment-status"));
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePaymentStatusFromForm(orderId, formData);
      if (result.ok) {
        toast.success("Paiement mis à jour");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        Marquer paiement reçu
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{paymentStatusLabel(targetPaymentStatus)}</DialogTitle>
          <DialogDescription>
            Le statut de paiement reste séparé du statut de commande et crée une entrée d&apos;historique.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          <input type="hidden" name="targetPaymentStatus" value={targetPaymentStatus} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          <div className="grid gap-2">
            <Label htmlFor="payment-reference">Référence de paiement{manualReferenceRecommended ? "" : " si disponible"}</Label>
            <Input id="payment-reference" name="reference" maxLength={120} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="payment-reason">Motif ou note de vérification</Label>
            <Textarea id="payment-reason" name="reason" maxLength={300} />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required />
            Je confirme que le paiement a été vérifié manuellement.
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InternalNoteDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await addInternalOrderNoteFromForm(orderId, formData);
      if (result.ok) {
        toast.success("Note interne ajoutée");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        Ajouter une note interne
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Note interne</DialogTitle>
          <DialogDescription>
            Les notes internes sont réservées au personnel et ne sont pas visibles dans le suivi client.
          </DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="internal-note">Note</Label>
            <Textarea id="internal-note" name="note" required maxLength={1000} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
