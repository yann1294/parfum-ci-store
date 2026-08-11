"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { addMessageNoteAction, assignMessageAction, createManualMessageAction, updateMessageStatusAction } from "@/app/admin/messages/actions";
import { Button } from "@/components/ui/button";

export function StatusActionButtons({ messageId, currentStatus }: { messageId: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const targets = currentStatus === "NEW"
    ? ["OPEN", "SPAM"]
    : currentStatus === "OPEN"
      ? ["RESOLVED", "SPAM"]
      : currentStatus === "SPAM" || currentStatus === "RESOLVED"
        ? ["OPEN"]
        : [];

  function submit(targetStatus: string) {
    startTransition(async () => {
      const result = await updateMessageStatusAction({ messageId, targetStatus, reason });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-surface p-4">
      <h3 className="font-heading text-2xl">Statut</h3>
      <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Motif pour résolution, spam ou réouverture" />
      <div className="flex flex-wrap gap-2">
        {targets.map((target) => (
          <Button key={target} type="button" variant="outline" disabled={pending} onClick={() => submit(target)}>
            {target === "OPEN" ? "Ouvrir" : target === "RESOLVED" ? "Marquer traité" : "Marquer spam"}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function AssignToSelfButton({ messageId, staffId }: { messageId: string; staffId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await assignMessageAction({ messageId, assignedTo: staffId });
        if (result.ok) toast.success(result.message);
        else toast.error(result.message);
      })}
    >
      M’assigner
    </Button>
  );
}

export function NoteForm({ messageId }: { messageId: string }) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3 rounded-lg border bg-surface p-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await addMessageNoteAction({ messageId, note });
          if (result.ok) {
            toast.success(result.message);
            setNote("");
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      <h3 className="font-heading text-2xl">Note interne</h3>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} className="rounded-lg border border-input bg-background px-3 py-2" />
      <Button type="submit" disabled={pending || note.trim().length === 0}>Ajouter la note</Button>
    </form>
  );
}

export function ManualMessageDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    source: "WHATSAPP",
    name: "",
    phone: "",
    email: "",
    externalHandle: "",
    subject: "",
    message: "",
    sourceReference: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  if (!open) {
    return <Button type="button" onClick={() => setOpen(true)}>Enregistrer une conversation reçue manuellement</Button>;
  }

  return (
    <div className="rounded-lg border bg-surface p-4">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await createManualMessageAction({
              idempotencyKey: `manual-${crypto.randomUUID()}-${Date.now().toString(16)}`,
              source: form.source,
              name: form.name,
              phone: form.phone || undefined,
              email: form.email || undefined,
              externalHandle: form.externalHandle || undefined,
              subject: form.subject,
              message: form.message,
              sourceReference: form.sourceReference || undefined,
              consent: false,
              honeypot: "",
            });
            if (result.ok) {
              toast.success(result.message);
              setOpen(false);
            } else {
              toast.error(result.message);
            }
          });
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-heading text-2xl">Conversation manuelle</h2>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Fermer</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">Source
            <select value={form.source} onChange={(event) => update("source", event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3">
              {["WHATSAPP", "INSTAGRAM", "FACEBOOK", "TIKTOK", "PHONE", "EMAIL", "OTHER"].map((source) => <option key={source} value={source}>{source}</option>)}
            </select>
          </label>
          <Field label="Nom" value={form.name} onChange={(value) => update("name", value)} />
          <Field label="Téléphone" value={form.phone} onChange={(value) => update("phone", value)} />
          <Field label="E-mail" value={form.email} onChange={(value) => update("email", value)} />
          <Field label="Handle ou référence" value={form.externalHandle} onChange={(value) => update("externalHandle", value)} />
          <Field label="Sujet" value={form.subject} onChange={(value) => update("subject", value)} />
        </div>
        <label className="grid gap-1 text-sm">Message
          <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={4} className="rounded-lg border border-input bg-background px-3 py-2" />
        </label>
        <Field label="Référence source" value={form.sourceReference} onChange={(value) => update("sourceReference", value)} />
        <Button type="submit" disabled={pending}>Enregistrer</Button>
      </form>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm">{label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3" />
    </label>
  );
}
