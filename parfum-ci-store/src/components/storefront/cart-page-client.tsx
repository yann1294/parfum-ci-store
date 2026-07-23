"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { formatXof } from "@/lib/catalogue/format";
import { absoluteUrl, buildWhatsAppUrlForNumber, normalizeWhatsAppNumber, siteConfig } from "@/config/site";
import {
  CART_RECONCILIATION_STALE_MS,
  type CartState,
  clearCart,
  readCart,
  removeCartLine,
  updateCartQuantity,
} from "@/lib/storefront/cart";
import type { ReconciledCart, ReconciledCartLine } from "@/lib/storefront/cart-reconciliation-core";

type ValidationState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string | null;
  snapshot: ReconciledCart | null;
};

function emptySnapshot(): ReconciledCart {
  return {
    lines: [],
    subtotalXof: 0,
    readiness: "EMPTY",
    validatedAt: new Date().toISOString(),
  };
}

function availabilityLabel(line: ReconciledCartLine) {
  if (line.availability === "STOCK_NOT_CONFIGURED") return "Stock non configuré";
  if (line.availability === "OUT_OF_STOCK") return "Rupture de stock";
  if (line.availability === "LOW_STOCK") return "Stock limité";
  if (line.availability === "AVAILABLE") return "Disponible";
  return line.unavailableReason ?? "Indisponible";
}

export function buildCartWhatsAppMessage(snapshot: ReconciledCart) {
  return [
    "Bonjour, je souhaite commander ces articles :",
    ...snapshot.lines
      .filter((line) => line.orderable && line.unitPriceXof && line.productSlug)
      .flatMap((line, index) => [
        "",
        `${index + 1}. ${line.productName}`,
        `Variante: ${line.variantLabel}`,
        `Quantité: ${line.adjustedQuantity}`,
        `Prix unitaire: ${formatXof(line.unitPriceXof ?? 0)}`,
        `Total ligne: ${formatXof((line.unitPriceXof ?? 0) * line.adjustedQuantity)}`,
        `Lien: ${absoluteUrl(`/parfums/${line.productSlug}`)}`,
      ]),
    "",
    `Sous-total panier: ${formatXof(snapshot.subtotalXof)}`,
    "Merci de confirmer la disponibilité finale, les frais de livraison et les modalités de paiement.",
  ].join("\n");
}

async function reconcileCart(cart: CartState, signal?: AbortSignal) {
  const response = await fetch("/api/cart/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cart.items }),
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as ReconciledCart | { error?: { code: string; message: string } };
  if ("error" in payload && payload.error) throw new Error(payload.error.code);
  return payload as ReconciledCart;
}

export function CartPageClient({ whatsappNumber }: { whatsappNumber?: string }) {
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartState | null>(null);
  const [validation, setValidation] = useState<ValidationState>({
    status: "idle",
    message: null,
    snapshot: null,
  });
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastValidatedAt = useRef(0);
  const liveMessageRef = useRef<HTMLParagraphElement>(null);

  const refreshCart = useCallback((force = false) => {
    const nextCart = readCart();
    setCart(nextCart);
    setHydrated(true);

    if (nextCart.items.length === 0) {
      abortRef.current?.abort();
      setValidation({ status: "ready", message: null, snapshot: emptySnapshot() });
      return;
    }

    if (!force && Date.now() - lastValidatedAt.current < CART_RECONCILIATION_STALE_MS) return;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setValidation((current) => ({ ...current, status: "loading", message: null }));

    reconcileCart(nextCart, controller.signal)
      .then((snapshot) => {
        if (controller.signal.aborted || requestId.current !== currentRequest) return;
        lastValidatedAt.current = Date.now();
        setValidation({ status: "ready", message: null, snapshot });
        liveMessageRef.current?.replaceChildren(
          document.createTextNode(`Panier vérifié, ${snapshot.lines.length} article(s).`),
        );
      })
      .catch(() => {
        if (controller.signal.aborted || requestId.current !== currentRequest) return;
        setValidation((current) => ({
          ...current,
          status: "error",
          message: "Le panier n'a pas pu être vérifié pour le moment.",
        }));
      });
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => refreshCart(true), 0);
    const onCartChange = () => refreshCart(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "parfum-ci:cart") return;
      refreshCart(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCart(false);
    };

    window.addEventListener("parfum-ci-cart-change", onCartChange);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      abortRef.current?.abort();
      window.clearTimeout(initialRefresh);
      window.removeEventListener("parfum-ci-cart-change", onCartChange);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshCart]);

  const snapshot = validation.snapshot;
  const normalizedWhatsAppNumber = normalizeWhatsAppNumber(whatsappNumber) ?? siteConfig.whatsappNumber;
  const hasUnavailable = snapshot?.lines.some((line) => !line.orderable) ?? false;
  const hasAdjustments = snapshot?.readiness === "HAS_QUANTITY_ADJUSTMENTS";
  const canOrder = Boolean(
    normalizedWhatsAppNumber &&
      snapshot &&
      snapshot.lines.length > 0 &&
      snapshot.readiness === "READY" &&
      validation.status === "ready",
  );

  const itemCount = useMemo(() => cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0, [cart]);

  async function openWhatsApp() {
    if (!cart || !normalizedWhatsAppNumber) return;
    setValidation((current) => ({ ...current, status: "loading", message: null }));

    try {
      const latest = await reconcileCart(readCart());
      setValidation({ status: "ready", message: null, snapshot: latest });
      if (latest.readiness !== "READY") return;
      const url = buildWhatsAppUrlForNumber(normalizedWhatsAppNumber, buildCartWhatsAppMessage(latest));
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setValidation((current) => ({
        ...current,
        status: "error",
        message: "Le panier n'a pas pu être vérifié pour le moment.",
      }));
    }
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border bg-surface p-8" role="status" aria-live="polite">
        Chargement du panier...
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="rounded-lg border bg-surface p-8 text-center">
        <h1 className="font-heading text-4xl">Votre panier est vide</h1>
        <p className="mt-2 text-muted-foreground">Ajoutez un parfum depuis le catalogue.</p>
        <Link href="/catalogue" className={buttonVariants({ className: "mt-5" })}>
          Continuer mes achats
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <p ref={liveMessageRef} className="sr-only" aria-live="polite" />
      <section className="grid gap-4">
        <div>
          <h1 className="font-heading text-5xl">Panier</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {itemCount} article(s). La disponibilité est vérifiée avec le catalogue avant commande.
          </p>
        </div>

        {validation.status === "loading" ? (
          <div className="rounded-lg border bg-surface p-4 text-sm" role="status" aria-live="polite">
            Vérification du panier...
          </div>
        ) : null}
        {validation.message ? (
          <div className="rounded-lg border border-destructive/30 bg-surface p-4 text-sm text-destructive">
            {validation.message}
            <Button type="button" variant="outline" size="sm" className="ml-3" onClick={() => refreshCart(true)}>
              Réessayer
            </Button>
          </div>
        ) : null}

        {(snapshot?.lines ?? []).map((line) => (
          <CartLineRow key={line.variantId} line={line} />
        ))}
      </section>
      <aside className="h-fit rounded-lg border bg-surface p-5">
        <h2 className="font-heading text-3xl">Résumé</h2>
        <div className="mt-4 flex justify-between">
          <span>Sous-total</span>
          <span>{formatXof(snapshot?.subtotalXof ?? 0)}</span>
        </div>
        {snapshot?.validatedAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Vérifié le {new Date(snapshot.validatedAt).toLocaleString("fr-FR")}
          </p>
        ) : null}
        {hasUnavailable ? (
          <p className="mt-4 text-sm text-destructive">
            Retirez ou corrigez les articles indisponibles avant d&apos;envoyer la demande.
          </p>
        ) : null}
        {hasAdjustments ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Une quantité demandée dépasse la disponibilité actuelle.
          </p>
        ) : null}
        <p className="mt-4 text-sm text-muted-foreground">
          La disponibilité finale, les frais de livraison et les modalités de paiement seront confirmés avant validation de la commande.
        </p>
        <div className="mt-5 grid gap-3">
          {normalizedWhatsAppNumber ? (
            <Button type="button" className="w-full" onClick={openWhatsApp} disabled={!canOrder}>
              Commander via WhatsApp
            </Button>
          ) : null}
          <Link href="/catalogue" className={buttonVariants({ variant: "outline", className: "w-full" })}>
            Continuer mes achats
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (window.confirm("Vider le panier ?")) clearCart();
            }}
          >
            Vider le panier
          </Button>
        </div>
      </aside>
    </div>
  );
}

function CartLineRow({ line }: { line: ReconciledCartLine }) {
  const lineTotal = line.orderable && line.unitPriceXof ? line.unitPriceXof * line.adjustedQuantity : 0;

  return (
    <article className="grid gap-4 rounded-lg border bg-surface p-4 sm:grid-cols-[6rem_1fr_auto]">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
        {line.imageUrl ? <Image src={line.imageUrl} alt={line.imageAlt} fill sizes="96px" className="object-cover" /> : null}
      </div>
      <div>
        {line.productSlug ? (
          <Link href={`/parfums/${line.productSlug}`} className="font-medium hover:underline">
            {line.productName}
          </Link>
        ) : (
          <p className="font-medium">{line.productName}</p>
        )}
        <p className="text-sm text-muted-foreground">{line.variantLabel}</p>
        <p className="mt-2">{line.unitPriceXof ? formatXof(line.unitPriceXof) : "Prix indisponible"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{availabilityLabel(line)}</p>
        {line.notices.includes("CART_QUANTITY_REDUCED") ? (
          <p className="mt-1 text-sm text-muted-foreground">Quantité ajustée selon la disponibilité actuelle.</p>
        ) : null}
        {!line.orderable ? (
          <p className="mt-1 text-sm text-destructive">Cet article ne peut pas être commandé actuellement.</p>
        ) : null}
        {lineTotal > 0 ? <p className="mt-2 text-sm font-medium">Total: {formatXof(lineTotal)}</p> : null}
      </div>
      <div className="grid gap-3">
        <label className="grid gap-1 text-sm">
          Quantité
          <input
            type="number"
            min={1}
            max={line.maxQuantity || 1}
            value={line.adjustedQuantity}
            onChange={(event) =>
              updateCartQuantity(line.variantId, Number.parseInt(event.currentTarget.value, 10) || 1)
            }
            disabled={!line.orderable}
            aria-label={`Quantité pour ${line.productName} ${line.variantLabel}`}
            className="h-10 w-24 rounded-lg border border-input bg-background px-3"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removeCartLine(line.variantId)}
          aria-label={`Retirer ${line.productName} ${line.variantLabel} du panier`}
        >
          Retirer
        </Button>
      </div>
    </article>
  );
}
