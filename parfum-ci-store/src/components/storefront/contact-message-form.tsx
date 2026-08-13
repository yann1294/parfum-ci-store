"use client";

import { useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { normalizeCoteDIvoirePhoneResult } from "@/lib/orders/phone";
import { readAttribution } from "@/lib/storefront/attribution";

type ContactMessageFormProps = {
  productContext?: {
    productId?: string;
    variantId?: string;
    productSlug?: string;
  };
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  preferredContactMethod: "PHONE" | "EMAIL" | "WHATSAPP";
  subject: string;
  message: string;
  consent: boolean;
  orderNumber: string;
  honeypot: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  preferredContactMethod: "PHONE",
  subject: "",
  message: "",
  consent: false,
  orderNumber: "",
  honeypot: "",
};

function createIdempotencyKey() {
  const random = crypto.randomUUID();
  return `contact-${random}-${Date.now().toString(16)}`;
}

export function ContactMessageForm({ productContext }: ContactMessageFormProps) {
  const [form, setForm] = useState(initialFormState);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const keyRef = useRef(createIdempotencyKey());
  const hasProductContext = Boolean(productContext?.productId || productContext?.productSlug);
  const defaultSubject = useMemo(() => hasProductContext ? "Demande d'information produit" : "", [hasProductContext]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Indiquez votre nom.";
    if (!form.email.trim() && !form.phone.trim()) nextErrors.phone = "Ajoutez un téléphone ou un e-mail.";
    if (form.subject.trim().length < 3 && !defaultSubject) nextErrors.subject = "Indiquez un sujet.";
    if (form.message.trim().length < 10) nextErrors.message = "Votre message doit contenir au moins 10 caractères.";
    if (!form.consent) nextErrors.consent = "Confirmez l'utilisation de ces informations pour vous répondre.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    if (!validate() || pending) return;
    const normalizedPhone = form.phone.trim() ? normalizeCoteDIvoirePhoneResult(form.phone) : null;
    const normalizedWhatsapp = form.whatsapp.trim() ? normalizeCoteDIvoirePhoneResult(form.whatsapp) : null;
    if (normalizedPhone && !normalizedPhone.ok) {
      setErrors((current) => ({ ...current, phone: "Saisissez un numéro de téléphone ivoirien valide." }));
      setStatus({ kind: "error", message: "Saisissez un numéro de téléphone ivoirien valide." });
      return;
    }
    if (normalizedWhatsapp && !normalizedWhatsapp.ok) {
      setErrors((current) => ({ ...current, whatsapp: "Saisissez un numéro WhatsApp ivoirien valide." }));
      setStatus({ kind: "error", message: "Saisissez un numéro de téléphone ivoirien valide." });
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/contact/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: keyRef.current,
          source: "WEBSITE",
          name: form.name,
          email: form.email || undefined,
          phone: normalizedPhone?.value || undefined,
          whatsapp: normalizedWhatsapp?.value || undefined,
          preferredContactMethod: form.preferredContactMethod,
          subject: form.subject || defaultSubject,
          message: form.message,
          consent: form.consent,
          honeypot: form.honeypot,
          orderNumber: form.orderNumber || undefined,
          productContext,
          sourcePage: window.location.pathname,
          attribution: readAttribution() ?? undefined,
        }),
      });
      const payload = await response.json().catch(() => null) as { message?: string; error?: { message?: string } } | null;
      if (!response.ok) {
        setStatus({ kind: "error", message: payload?.error?.message ?? "Le message n’a pas pu être envoyé. Réessayez." });
        return;
      }
      setStatus({ kind: "success", message: payload?.message ?? "Votre message a bien été envoyé." });
      setForm(initialFormState);
      keyRef.current = createIdempotencyKey();
    } catch {
      setStatus({ kind: "error", message: "Le message n’a pas pu être envoyé. Réessayez." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-lg border bg-surface p-5" noValidate>
      <div>
        <h2 className="font-heading text-3xl">Envoyer un message</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Un téléphone ou un e-mail suffit. Notre équipe vous répondra selon le moyen indiqué.
        </p>
      </div>

      {status ? (
        <Alert variant={status.kind === "error" ? "destructive" : "default"} role="status">
          <AlertTitle>{status.kind === "error" ? "Message non envoyé" : "Message envoyé"}</AlertTitle>
          <AlertDescription>{status.message}</AlertDescription>
        </Alert>
      ) : null}

      {hasProductContext ? (
        <p className="rounded-md bg-muted p-3 text-sm">Votre demande inclut le contexte du produit consulté.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom complet" error={errors.name}>
          <input value={form.name} onChange={(event) => update("name", event.target.value)} autoComplete="name" className="h-10 rounded-lg border border-input bg-background px-3" />
        </Field>
        <Field label="E-mail" error={errors.email}>
          <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" className="h-10 rounded-lg border border-input bg-background px-3" />
        </Field>
        <Field label="Téléphone" error={errors.phone}>
          <input value={form.phone} onChange={(event) => update("phone", event.target.value)} inputMode="tel" autoComplete="tel" className="h-10 rounded-lg border border-input bg-background px-3" />
        </Field>
        <Field label="Numéro WhatsApp" error={errors.whatsapp}>
          <input value={form.whatsapp} onChange={(event) => update("whatsapp", event.target.value)} inputMode="tel" className="h-10 rounded-lg border border-input bg-background px-3" />
        </Field>
      </div>

      <Field label="Moyen de réponse préféré">
        <select value={form.preferredContactMethod} onChange={(event) => update("preferredContactMethod", event.target.value as FormState["preferredContactMethod"])} className="h-10 rounded-lg border border-input bg-background px-3">
          <option value="PHONE">Téléphone</option>
          <option value="EMAIL">E-mail</option>
          <option value="WHATSAPP">WhatsApp</option>
        </select>
      </Field>

      <Field label="Numéro de commande (facultatif)">
        <input value={form.orderNumber} onChange={(event) => update("orderNumber", event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3" />
      </Field>

      <Field label="Sujet" error={errors.subject}>
        <input value={form.subject} onChange={(event) => update("subject", event.target.value)} placeholder={defaultSubject} className="h-10 rounded-lg border border-input bg-background px-3" />
      </Field>

      <Field label="Message" error={errors.message}>
        <textarea value={form.message} onChange={(event) => update("message", event.target.value)} rows={6} className="rounded-lg border border-input bg-background px-3 py-2" />
      </Field>

      <label className="sr-only">
        Site web
        <input value={form.honeypot} onChange={(event) => update("honeypot", event.target.value)} tabIndex={-1} autoComplete="off" />
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={form.consent} onChange={(event) => update("consent", event.target.checked)} className="mt-1" />
        <span>
          J’accepte que les informations fournies soient utilisées pour répondre à ma demande.
          {errors.consent ? <span className="block text-destructive">{errors.consent}</span> : null}
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Envoi..." : "Envoyer le message"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </label>
  );
}
