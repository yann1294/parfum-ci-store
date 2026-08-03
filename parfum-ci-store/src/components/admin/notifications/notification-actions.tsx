"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelNotificationFromForm, retryNotificationFromForm } from "@/app/admin/notifications/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RetryNotificationButton({ notificationId, disabled }: { notificationId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          const result = await retryNotificationFromForm(notificationId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        });
      }}
    >
      {pending ? "Relance..." : "Relancer"}
    </Button>
  );
}

export function CancelNotificationDialog({ notificationId, disabled }: { notificationId: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await cancelNotificationFromForm(notificationId, formData);
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" disabled={disabled} />}>Annuler</DialogTrigger>
      <DialogContent className="max-h-[min(32rem,calc(100dvh-2rem))] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Annuler la notification</DialogTitle>
          <DialogDescription>Cette action annule uniquement l&apos;envoi de la notification. Elle ne modifie pas la commande.</DialogDescription>
        </DialogHeader>
        <form action={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`cancel-reason-${notificationId}`}>Motif</Label>
            <Textarea id={`cancel-reason-${notificationId}`} name="reason" required maxLength={300} />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Annulation..." : "Confirmer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
