"use client";

import * as React from "react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXof } from "@/lib/catalogue/format";

type TrackingPayload = {
  found: boolean;
  message?: string;
  order?: {
    orderNumber: string;
    statusLabel: string;
    paymentStatusLabel: string;
    createdAt: string;
    lastUpdatedAt: string;
    maskedPhone: string;
    deliveryMethodLabel: string;
    paymentMethodLabel: string;
    subtotalXof: number;
    deliveryFeeXof: number;
    totalXof: number;
    paymentInstructions: string[];
    items: Array<{ productName: string; variantLabel: string | null; quantity: number }>;
    timeline: Array<{ label: string; createdAt: string }>;
  };
};

export function OrderTrackingClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<TrackingPayload | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setResult(null);

    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ orderNumber, phone, honeypot: website }),
      });
      setResult((await response.json()) as TrackingPayload);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[24rem_minmax(0,1fr)]">
      <section className="rounded-lg border bg-surface p-6">
        <h1 className="font-heading text-5xl">Suivre ma commande</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Saisissez votre numéro de commande et le téléphone utilisé lors de la commande.
        </p>

        <form className="mt-6 grid gap-4" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor="order-number">Numéro de commande</Label>
            <Input
              id="order-number"
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.currentTarget.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tracking-phone">Téléphone</Label>
            <Input
              id="tracking-phone"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
              inputMode="tel"
              autoComplete="tel"
              required
            />
          </div>
          <input
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.currentTarget.value)}
            aria-hidden="true"
          />
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Recherche..." : "Rechercher"}
          </Button>
        </form>
      </section>

      <section className="min-h-64 rounded-lg border bg-surface p-6" aria-live="polite">
        {status === "idle" ? (
          <p className="text-muted-foreground">Le résultat du suivi s&apos;affichera ici.</p>
        ) : null}
        {status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>Suivi indisponible</AlertTitle>
            <AlertDescription>La recherche n&apos;a pas pu aboutir. Réessayez dans quelques instants.</AlertDescription>
          </Alert>
        ) : null}
        {status === "done" && result && !result.found ? (
          <Alert>
            <AlertTitle>Commande introuvable</AlertTitle>
            <AlertDescription>
              Aucune commande ne correspond aux informations fournies. Vérifiez le numéro et le téléphone.
            </AlertDescription>
          </Alert>
        ) : null}
        {status === "done" && result?.found && result.order ? <TrackingResult order={result.order} /> : null}
      </section>
    </div>
  );
}

function TrackingResult({ order }: { order: NonNullable<TrackingPayload["order"]> }) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Commande {order.orderNumber}</p>
        <h2 className="font-heading text-4xl">{order.statusLabel}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Téléphone: {order.maskedPhone} · Dernière mise à jour: {new Date(order.lastUpdatedAt).toLocaleString("fr-FR")}
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Info label="Paiement" value={order.paymentStatusLabel} />
        <Info label="Livraison" value={order.deliveryMethodLabel} />
        <Info label="Mode de paiement" value={order.paymentMethodLabel} />
        <Info label="Sous-total" value={formatXof(order.subtotalXof)} />
        <Info label="Frais de livraison" value={formatXof(order.deliveryFeeXof)} />
        <Info label="Total" value={formatXof(order.totalXof)} />
      </dl>

      {order.paymentInstructions.length > 0 ? <section className="rounded-lg bg-surface-muted p-4"><h3 className="font-heading text-2xl">Instructions de paiement</h3><div className="mt-2 grid gap-1 text-sm text-muted-foreground">{order.paymentInstructions.map((line) => <p key={line}>{line}</p>)}</div></section> : null}

      <div>
        <h3 className="font-heading text-2xl">Articles</h3>
        <div className="mt-3 grid gap-2">
          {order.items.map((item, index) => (
            <article key={`${item.productName}-${index}`} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{item.productName}</p>
              {item.variantLabel ? <p className="text-muted-foreground">{item.variantLabel}</p> : null}
              <p>Quantité: {item.quantity}</p>
            </article>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-2xl">Historique</h3>
        <ol className="mt-3 grid gap-3">
          {order.timeline.map((entry) => (
            <li key={`${entry.label}-${entry.createdAt}`} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{entry.label}</p>
              <p className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString("fr-FR")}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
