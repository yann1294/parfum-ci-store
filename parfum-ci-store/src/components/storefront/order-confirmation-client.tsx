"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { formatXof } from "@/lib/catalogue/format";
import { buildWhatsAppUrlForNumber, normalizeWhatsAppNumber } from "@/config/site";
import { readSafeConfirmation } from "@/lib/orders/checkout-client";
import {
  deliveryMethodLabel,
  maskEmail,
  maskPhone,
  paymentInstructionForMethod,
  paymentMethodLabel,
  paymentStatusLabel,
  orderStatusLabel,
  type PaymentInstructionSettings,
  type SafeConfirmation,
} from "@/lib/orders/display";

type OrderConfirmationClientProps = {
  orderNumber: string;
  settings: PaymentInstructionSettings;
};

export function OrderConfirmationClient({ orderNumber, settings }: OrderConfirmationClientProps) {
  const [confirmation, setConfirmation] = useState<SafeConfirmation | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => setConfirmation(readSafeConfirmation(orderNumber)), 0);
    return () => window.clearTimeout(timer);
  }, [orderNumber]);

  const whatsappUrl = useMemo(() => {
    const number = normalizeWhatsAppNumber(settings.whatsappNumber ?? undefined);
    return buildWhatsAppUrlForNumber(
      number,
      `Bonjour, j'ai une question concernant ma commande ${orderNumber}.`,
    );
  }, [orderNumber, settings.whatsappNumber]);

  if (confirmation === undefined) {
    return (
      <div className="rounded-lg border bg-surface p-8" role="status" aria-live="polite">
        Chargement de la confirmation...
      </div>
    );
  }

  if (!confirmation) {
    return (
      <div className="rounded-lg border bg-surface p-8">
        <h1 className="font-heading text-5xl">Commande reçue</h1>
        <p className="mt-3 text-muted-foreground">
          Si votre commande a été envoyée, conservez votre numéro de commande. Pour consulter le suivi détaillé,
          utilisez le numéro de commande avec le téléphone indiqué lors de la commande.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/suivi-commande" className={buttonVariants()}>
            Suivre ma commande
          </Link>
          {whatsappUrl ? (
            <a href={whatsappUrl} className={buttonVariants({ variant: "outline" })}>
              Contacter la boutique
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  const instructions = paymentInstructionForMethod(confirmation.paymentMethod, settings, confirmation.orderNumber);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="rounded-lg border bg-surface p-6">
        <p className="text-sm font-medium text-muted-foreground">Commande {confirmation.orderNumber}</p>
        <h1 className="mt-2 font-heading text-5xl">Commande reçue</h1>
        <p className="mt-3 text-muted-foreground">
          Votre demande est enregistrée. Les frais affichés sont ceux enregistrés avec la commande; l&apos;équipe confirmera les prochaines étapes.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Info label="Statut" value={orderStatusLabel(confirmation.orderStatus)} />
          <Info label="Paiement" value={paymentStatusLabel(confirmation.paymentStatus)} />
          <Info label="Livraison" value={deliveryMethodLabel(confirmation.deliveryMethod)} />
          <Info label="Mode de paiement" value={paymentMethodLabel(confirmation.paymentMethod)} />
          <Info label="Téléphone" value={maskPhone(confirmation.customerPhone)} />
          {confirmation.customerEmail ? <Info label="E-mail" value={maskEmail(confirmation.customerEmail)} /> : null}
        </dl>

        {instructions ? (
          <div className="mt-6 rounded-lg bg-surface-muted p-4">
            <h2 className="font-heading text-2xl">Instructions de paiement</h2>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              {instructions.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/suivi-commande" className={buttonVariants()}>
            Suivre ma commande
          </Link>
          {whatsappUrl ? (
            <a href={whatsappUrl} className={buttonVariants({ variant: "outline" })}>
              Contacter sur WhatsApp
            </a>
          ) : null}
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </section>

      <aside className="h-fit rounded-lg border bg-surface p-5">
        <h2 className="font-heading text-3xl">Résumé</h2>
        <div className="mt-4 grid gap-3">
          {confirmation.items.map((item, index) => (
            <article key={`${item.productName}-${index}`} className="border-b pb-3 text-sm last:border-b-0">
              <p className="font-medium">{item.productName}</p>
              {item.variantLabel ? <p className="text-muted-foreground">{item.variantLabel}</p> : null}
              <p>
                {formatXof(item.unitPriceXof)} x {item.quantity}
              </p>
              <p className="font-medium">{formatXof(item.lineTotalXof)}</p>
            </article>
          ))}
        </div>
        <div className="mt-4 grid gap-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatXof(confirmation.subtotalXof)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de livraison</span>
            <span>{formatXof(confirmation.deliveryFeeXof)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{formatXof(confirmation.totalXof)}</span>
          </div>
        </div>
      </aside>
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
