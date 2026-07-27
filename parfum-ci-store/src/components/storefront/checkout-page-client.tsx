"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatXof } from "@/lib/catalogue/format";
import {
  cartMaterialSignature,
  createCheckoutIdempotencyKey,
  readSafeConfirmation,
  storeSafeConfirmation,
} from "@/lib/orders/checkout-client";
import {
  buildGuestOrderRequest,
  checkoutOrderErrorSchema,
  checkoutOrderSuccessSchema,
  type CheckoutOrderSuccess,
} from "@/lib/orders/checkout-submit-client";
import {
  deliveryMethodLabel,
  configuredPaymentMethodLabel,
  merchantNumberForPaymentMethod,
  paymentInstructionForMethod,
  paymentMethodIsMobileMoney,
  type DeliveryMethod,
  type PaymentMethod,
  type PaymentInstructionSettings,
} from "@/lib/orders/display";
import { CART_RECONCILIATION_STALE_MS, clearCart, readCart, type CartState } from "@/lib/storefront/cart";
import { reconcileCartClient } from "@/lib/storefront/cart-reconcile-client";
import type { ReconciledCart, ReconciledCartLine } from "@/lib/storefront/cart-reconciliation-core";
import { readAttribution } from "@/lib/storefront/attribution";

type CheckoutPageClientProps = {
  settings: PaymentInstructionSettings & {
    enabledPaymentMethods: PaymentMethod[];
    enabledDeliveryMethods: DeliveryMethod[];
  };
};

type FieldErrors = Partial<Record<keyof CheckoutFormState | "form", string>>;

type CheckoutFormState = {
  fullName: string;
  phone: string;
  email: string;
  whatsapp: string;
  city: string;
  commune: string;
  address: string;
  landmark: string;
  deliveryInstructions: string;
  customerNote: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  termsAccepted: boolean;
  website: string;
};

type OrderErrorCode =
  | "ORDER_INVALID_REQUEST"
  | "ORDER_INVALID_PHONE"
  | "ORDER_EMPTY_CART"
  | "ORDER_TOO_MANY_LINES"
  | "ORDER_ITEM_UNAVAILABLE"
  | "ORDER_INSUFFICIENT_STOCK"
  | "ORDER_INVENTORY_NOT_CONFIGURED"
  | "ORDER_IDEMPOTENCY_CONFLICT"
  | "ORDER_RATE_LIMITED"
  | "ORDER_CREATION_FAILED"
  | "ORDER_PAYMENT_METHOD_DISABLED"
  | "ORDER_DELIVERY_METHOD_DISABLED";

const optionalEmail = z.union([z.literal(""), z.email("Saisissez une adresse e-mail valide.")]);
const text = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Maximum ${max} caractères.`)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Caractères non autorisés.");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} caractères.`)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Caractères non autorisés.");

const checkoutFormSchema = z
  .object({
    fullName: text(120, "Le nom complet est requis."),
    phone: text(40, "Le téléphone est requis."),
    email: optionalEmail,
    whatsapp: optionalText(40),
    city: text(80, "La ville est requise."),
    commune: text(120, "La commune ou le quartier est requis."),
    address: optionalText(240),
    landmark: optionalText(180),
    deliveryInstructions: optionalText(500),
    customerNote: optionalText(500),
    deliveryMethod: z.enum(["HOME_DELIVERY", "PICKUP"]),
    paymentMethod: z.enum([
      "CASH_ON_DELIVERY",
      "ORANGE_MONEY",
      "MTN_MOMO",
      "WAVE",
      "MOOV_MONEY",
      "BANK_TRANSFER",
      "PAY_IN_STORE",
    ]),
    termsAccepted: z.boolean().refine((value) => value, "Vous devez accepter les conditions de livraison et de retour."),
    website: z.literal(""),
  })
  .strict();

function initialForm(settings: CheckoutPageClientProps["settings"]): CheckoutFormState {
  return {
    fullName: "",
    phone: "",
    email: "",
    whatsapp: "",
    city: "Abidjan",
    commune: "",
    address: "",
    landmark: "",
    deliveryInstructions: "",
    customerNote: "",
    deliveryMethod: settings.enabledDeliveryMethods[0] ?? "HOME_DELIVERY",
    paymentMethod: settings.enabledPaymentMethods[0] ?? "CASH_ON_DELIVERY",
    termsAccepted: false,
    website: "",
  };
}

function emptySnapshot(): ReconciledCart {
  return { lines: [], subtotalXof: 0, readiness: "EMPTY", validatedAt: new Date().toISOString() };
}

function orderErrorMessage(code: OrderErrorCode | string) {
  const messages: Record<OrderErrorCode, string> = {
    ORDER_INVALID_REQUEST: "Certaines informations sont invalides. Vérifiez le formulaire.",
    ORDER_INVALID_PHONE: "Saisissez un numéro de téléphone ivoirien valide.",
    ORDER_EMPTY_CART: "Votre panier est vide.",
    ORDER_TOO_MANY_LINES: "Votre panier contient trop d'articles.",
    ORDER_ITEM_UNAVAILABLE: "Un article de votre panier n'est plus disponible.",
    ORDER_INSUFFICIENT_STOCK: "La quantité disponible d'un article a changé.",
    ORDER_INVENTORY_NOT_CONFIGURED: "Un article ne peut pas être commandé pour le moment.",
    ORDER_IDEMPOTENCY_CONFLICT: "Le contenu de la commande a changé. Veuillez vérifier votre panier avant de réessayer.",
    ORDER_RATE_LIMITED: "Trop de tentatives ont été effectuées. Réessayez dans quelques instants.",
    ORDER_CREATION_FAILED: "La commande n'a pas pu être créée. Aucun paiement ni réservation supplémentaire n'a été effectué.",
    ORDER_PAYMENT_METHOD_DISABLED: "Ce mode de paiement n'est plus disponible.",
    ORDER_DELIVERY_METHOD_DISABLED: "Ce mode de livraison n'est plus disponible.",
  };
  return messages[code as OrderErrorCode] ?? messages.ORDER_CREATION_FAILED;
}

function availabilityLabel(line: ReconciledCartLine) {
  if (line.availability === "STOCK_NOT_CONFIGURED") return "Stock non configuré";
  if (line.availability === "OUT_OF_STOCK") return "Rupture de stock";
  if (line.availability === "LOW_STOCK") return "Stock limité";
  if (line.availability === "AVAILABLE") return "Disponible";
  return line.unavailableReason ?? "Indisponible";
}

function requestIntentSignature(form: CheckoutFormState, cart: CartState | null) {
  return JSON.stringify({
    cart: cartMaterialSignature(cart),
    customer: {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      whatsapp: form.whatsapp.trim(),
      city: form.city.trim(),
      commune: form.commune.trim(),
      address: form.address.trim(),
      landmark: form.landmark.trim(),
      deliveryInstructions: form.deliveryInstructions.trim(),
      customerNote: form.customerNote.trim(),
    },
    deliveryMethod: form.deliveryMethod,
    paymentMethod: form.paymentMethod,
  });
}

export function CheckoutPageClient({ settings }: CheckoutPageClientProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [cart, setCart] = useState<CartState | null>(null);
  const [snapshot, setSnapshot] = useState<ReconciledCart | null>(null);
  const [status, setStatus] = useState<"idle" | "validating" | "ready" | "error" | "submitting" | "review" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<CheckoutFormState>(() => initialForm(settings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [idempotencyKey, setIdempotencyKey] = useState(createCheckoutIdempotencyKey);
  const [lastSubmittedIntent, setLastSubmittedIntent] = useState<string | null>(null);
  const [successfulOrder, setSuccessfulOrder] = useState<CheckoutOrderSuccess | null>(null);
  const firstInvalidRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null);
  const submissionMessageRef = useRef<HTMLDivElement | null>(null);
  const lastCartSignatureRef = useRef<string>("empty");
  const snapshotRef = useRef<ReconciledCart | null>(null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastValidatedAt = useRef(0);

  const applySnapshot = useCallback((nextSnapshot: ReconciledCart) => {
    snapshotRef.current = nextSnapshot;
    setSnapshot(nextSnapshot);
  }, []);

  const validateCart = useCallback(async (force = false) => {
    const currentCart = readCart();
    setCart(currentCart);
    setHydrated(true);

    const signature = cartMaterialSignature(currentCart);
    const signatureChanged = signature !== lastCartSignatureRef.current;
    if (signatureChanged) {
      lastCartSignatureRef.current = signature;
      setIdempotencyKey(createCheckoutIdempotencyKey());
      setLastSubmittedIntent(null);
      lastValidatedAt.current = 0;
    }

    if (currentCart.items.length === 0) {
      abortRef.current?.abort();
      const empty = emptySnapshot();
      applySnapshot(empty);
      setStatus("ready");
      setMessage(null);
      return empty;
    }

    if (
      !force &&
      !signatureChanged &&
      snapshotRef.current &&
      Date.now() - lastValidatedAt.current < CART_RECONCILIATION_STALE_MS
    ) {
      return snapshotRef.current;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("validating");
    setMessage(null);
    try {
      const nextSnapshot = await reconcileCartClient(currentCart, controller.signal);
      if (controller.signal.aborted || requestId.current !== currentRequest) return null;
      lastValidatedAt.current = Date.now();
      applySnapshot(nextSnapshot);
      setStatus("ready");
      return nextSnapshot;
    } catch {
      if (controller.signal.aborted || requestId.current !== currentRequest) return null;
      setStatus("error");
      setMessage("Le panier n'a pas pu être vérifié pour le moment.");
      return null;
    }
  }, [applySnapshot]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void validateCart(true), 0);
    const onCartChange = () => void validateCart(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "parfum-ci:cart") return;
      void validateCart(true);
    };
    window.addEventListener("parfum-ci-cart-change", onCartChange);
    window.addEventListener("storage", onStorage);
    return () => {
      abortRef.current?.abort();
      window.clearTimeout(initialRefresh);
      window.removeEventListener("parfum-ci-cart-change", onCartChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [validateCart]);

  const readiness = snapshot?.readiness ?? "VALIDATING";
  const hasConfiguredPaymentMethod = settings.enabledPaymentMethods.length > 0;
  const formValid = useMemo(() => checkoutFormSchema.safeParse(form).success, [form]);
  const checkoutBlocked =
    !snapshot ||
    status === "validating" ||
    status === "submitting" ||
    status === "success" ||
    readiness !== "READY" ||
    !hasConfiguredPaymentMethod ||
    !formValid;
  const orderableLines = snapshot?.lines ?? [];
  const checkoutDisabledReason =
    status === "success"
      ? "Commande enregistrée. Ouverture de la confirmation..."
      : status === "validating"
        ? "Vérification du panier en cours."
        : readiness !== "READY"
          ? "Corrigez le panier avant de commander."
          : !hasConfiguredPaymentMethod
            ? "Aucun mode de paiement n'est configuré pour le moment."
            : !formValid
              ? "Complétez les champs requis et acceptez les conditions."
              : "La commande est en cours d'envoi.";

  function updateField<K extends keyof CheckoutFormState>(key: K, value: CheckoutFormState[K]) {
    if ((key === "deliveryMethod" || key === "paymentMethod") && form[key] !== value) {
      setIdempotencyKey(createCheckoutIdempotencyKey());
      setLastSubmittedIntent(null);
    }
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
  }

  function registerInvalidRef(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) {
    if (element && element.getAttribute("aria-invalid") === "true" && !firstInvalidRef.current) {
      firstInvalidRef.current = element;
    }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    firstInvalidRef.current = null;
    const parsed = checkoutFormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof CheckoutFormState | undefined;
        if (key) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      window.setTimeout(() => firstInvalidRef.current?.focus(), 0);
      return;
    }

    const latest = await validateCart(true);
    const latestCart = readCart();
    if (!latest || latest.readiness !== "READY" || latestCart.items.length === 0) {
      setStatus("review");
      setMessage("Vérifiez votre panier avant de réessayer.");
      return;
    }

    const intent = requestIntentSignature(form, latestCart);
    let key = idempotencyKey;
    if (lastSubmittedIntent && lastSubmittedIntent !== intent) {
      key = createCheckoutIdempotencyKey();
      setIdempotencyKey(key);
    }
    setLastSubmittedIntent(intent);
    setStatus("submitting");
    setMessage(null);
    setSuccessfulOrder(null);

    const requestBody = buildGuestOrderRequest({
      idempotencyKey: key,
      customer: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        city: parsed.data.city,
        commune: parsed.data.commune,
        email: parsed.data.email,
        whatsapp: parsed.data.whatsapp,
        address: parsed.data.address,
        landmark: parsed.data.landmark,
        deliveryInstructions: parsed.data.deliveryInstructions,
        customerNote: parsed.data.customerNote,
      },
      deliveryMethod: parsed.data.deliveryMethod,
      paymentMethod: parsed.data.paymentMethod,
      cart: latestCart,
      attribution: readAttribution() ?? null,
      honeypot: parsed.data.website,
    });

    let response: Response;
    let payload: unknown;
    try {
      response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(requestBody),
      });
      payload = await response.json();
    } catch {
      setStatus("review");
      setMessage("La commande n'a pas pu être enregistrée.");
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
      return;
    }

    const parsedError = checkoutOrderErrorSchema.safeParse(payload);
    if (!response.ok) {
      setStatus("review");
      const code = parsedError.success ? parsedError.data.error.code : "ORDER_CREATION_FAILED";
      const errorMessage = orderErrorMessage(code);
      setMessage(errorMessage);
      if (
        code === "ORDER_ITEM_UNAVAILABLE" ||
        code === "ORDER_INSUFFICIENT_STOCK" ||
        code === "ORDER_INVENTORY_NOT_CONFIGURED" ||
        code === "ORDER_PAYMENT_METHOD_DISABLED" ||
        code === "ORDER_DELIVERY_METHOD_DISABLED"
      ) {
        void validateCart(true).finally(() => {
          setStatus("review");
          setMessage(errorMessage);
        });
      }
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
      return;
    }

    if (parsedError.success) {
      setStatus("review");
      setMessage(orderErrorMessage(parsedError.data.error.code));
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
      return;
    }

    const parsedSuccess = checkoutOrderSuccessSchema.safeParse(payload);
    if (!parsedSuccess.success) {
      setStatus("review");
      setMessage("La commande n'a pas pu être enregistrée.");
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
      return;
    }

    const confirmation = parsedSuccess.data;
    const safeConfirmation = storeSafeConfirmation({
      confirmation,
      deliveryMethod: parsed.data.deliveryMethod,
      paymentMethod: parsed.data.paymentMethod,
      customerPhone: parsed.data.phone,
      customerEmail: parsed.data.email.trim() || undefined,
    });
    const confirmationPath = `/commande/succes/${encodeURIComponent(confirmation.orderNumber)}`;
    setSuccessfulOrder(confirmation);
    setStatus("success");
    setMessage("Commande enregistrée. Ouverture de la confirmation...");
    clearCart();
    setIdempotencyKey(createCheckoutIdempotencyKey());
    if (readSafeConfirmation(safeConfirmation.orderNumber)?.orderNumber !== safeConfirmation.orderNumber) {
      setMessage("Votre commande a bien été enregistrée.");
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
      return;
    }

    try {
      router.replace(confirmationPath);
    } catch {
      setStatus("success");
      setMessage("Votre commande a bien été enregistrée.");
      window.setTimeout(() => submissionMessageRef.current?.focus(), 0);
    }
  }

  if (!hydrated) {
    return (
      <div className="rounded-lg border bg-surface p-8" role="status" aria-live="polite">
        Chargement du panier...
      </div>
    );
  }

  if ((!cart || cart.items.length === 0 || snapshot?.readiness === "EMPTY") && !successfulOrder) {
    return (
      <div className="rounded-lg border bg-surface p-8 text-center">
        <h1 className="font-heading text-4xl">Finaliser ma commande</h1>
        <p className="mt-2 text-muted-foreground">Votre panier est vide.</p>
        <Link href="/catalogue" className={buttonVariants({ className: "mt-5" })}>
          Découvrir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <form className="grid gap-8" onSubmit={submitOrder} noValidate>
        <div>
          <h1 className="font-heading text-5xl">Finaliser ma commande</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            La disponibilité finale, les frais de livraison et les modalités de paiement seront confirmés avant validation de la commande.
          </p>
        </div>

        {message && !successfulOrder ? (
          <Alert
            ref={submissionMessageRef}
            tabIndex={-1}
            variant={status === "error" || status === "review" ? "destructive" : "default"}
          >
            <AlertTitle>Commande non envoyée</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {successfulOrder ? (
          <Alert ref={submissionMessageRef} tabIndex={-1}>
            <AlertTitle>Votre commande a bien été enregistrée.</AlertTitle>
            <AlertDescription>
              Commande {successfulOrder.orderNumber}. Si la confirmation ne s&apos;ouvre pas automatiquement, utilisez
              le bouton ci-dessous.
            </AlertDescription>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/commande/succes/${encodeURIComponent(successfulOrder.orderNumber)}`}
                className={buttonVariants()}
              >
                Voir la confirmation
              </Link>
              <Link href="/suivi-commande" className={buttonVariants({ variant: "outline" })}>
                Suivre ma commande
              </Link>
            </div>
          </Alert>
        ) : null}

        {readiness !== "READY" ? (
          <Alert>
            <AlertTitle>Panier à vérifier</AlertTitle>
            <AlertDescription>
              Certains articles nécessitent une correction avant de pouvoir finaliser la commande.
              <Link href="/panier" className="ml-1 underline underline-offset-4">
                Retour au panier
              </Link>
            </AlertDescription>
          </Alert>
        ) : null}

        <fieldset className="grid gap-5 rounded-lg border bg-surface p-5">
          <legend className="px-1 font-heading text-2xl">Coordonnées</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" error={errors.fullName}>
              <Input
                ref={registerInvalidRef}
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.currentTarget.value)}
                autoComplete="name"
                aria-invalid={Boolean(errors.fullName)}
              />
            </Field>
            <Field label="Téléphone" error={errors.phone}>
              <Input
                ref={registerInvalidRef}
                value={form.phone}
                onChange={(event) => updateField("phone", event.currentTarget.value)}
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
              />
            </Field>
            <Field label="E-mail" error={errors.email}>
              <Input
                ref={registerInvalidRef}
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.currentTarget.value)}
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
              />
            </Field>
            <Field label="Numéro WhatsApp" error={errors.whatsapp}>
              <Input
                ref={registerInvalidRef}
                value={form.whatsapp}
                onChange={(event) => updateField("whatsapp", event.currentTarget.value)}
                inputMode="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.whatsapp)}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-5 rounded-lg border bg-surface p-5">
          <legend className="px-1 font-heading text-2xl">Livraison</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ville" error={errors.city}>
              <Input
                ref={registerInvalidRef}
                value={form.city}
                onChange={(event) => updateField("city", event.currentTarget.value)}
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.city)}
              />
            </Field>
            <Field label="Commune ou quartier" error={errors.commune}>
              <Input
                ref={registerInvalidRef}
                value={form.commune}
                onChange={(event) => updateField("commune", event.currentTarget.value)}
                autoComplete="address-level3"
                aria-invalid={Boolean(errors.commune)}
              />
            </Field>
            <Field label="Adresse précise" error={errors.address}>
              <Input
                ref={registerInvalidRef}
                value={form.address}
                onChange={(event) => updateField("address", event.currentTarget.value)}
                autoComplete="street-address"
                aria-invalid={Boolean(errors.address)}
              />
            </Field>
            <Field label="Point de repère" error={errors.landmark}>
              <Input
                ref={registerInvalidRef}
                value={form.landmark}
                onChange={(event) => updateField("landmark", event.currentTarget.value)}
                aria-invalid={Boolean(errors.landmark)}
              />
            </Field>
          </div>
          <Field label="Mode de livraison" error={errors.deliveryMethod}>
            <select
              ref={registerInvalidRef}
              value={form.deliveryMethod}
              onChange={(event) => updateField("deliveryMethod", event.currentTarget.value as DeliveryMethod)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              aria-invalid={Boolean(errors.deliveryMethod)}
            >
              {settings.enabledDeliveryMethods.map((method) => (
                <option key={method} value={method}>
                  {deliveryMethodLabel(method)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Instructions de livraison" error={errors.deliveryInstructions}>
            <Textarea
              ref={registerInvalidRef}
              value={form.deliveryInstructions}
              onChange={(event) => updateField("deliveryInstructions", event.currentTarget.value)}
              aria-invalid={Boolean(errors.deliveryInstructions)}
            />
          </Field>
        </fieldset>

        <fieldset className="grid gap-4 rounded-lg border bg-surface p-5">
          <legend className="px-1 font-heading text-2xl">Paiement</legend>
          <Field label="Mode de paiement" error={errors.paymentMethod}>
            <select
              ref={registerInvalidRef}
              value={form.paymentMethod}
              onChange={(event) => updateField("paymentMethod", event.currentTarget.value as PaymentMethod)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              aria-invalid={Boolean(errors.paymentMethod)}
              disabled={!hasConfiguredPaymentMethod}
            >
              {settings.enabledPaymentMethods.map((method) => (
                <option key={method} value={method}>
                  {configuredPaymentMethodLabel(method, settings)}
                </option>
              ))}
            </select>
          </Field>
          {!hasConfiguredPaymentMethod ? (
            <p className="text-sm text-muted-foreground">
              Aucun mode de paiement n&apos;est configuré pour la commande en ligne. Contactez l&apos;équipe via WhatsApp.
            </p>
          ) : null}
          <PaymentInstructions settings={settings} method={form.paymentMethod} />
        </fieldset>

        <fieldset className="grid gap-4 rounded-lg border bg-surface p-5">
          <legend className="px-1 font-heading text-2xl">Note et conditions</legend>
          <Field label="Note" error={errors.customerNote}>
            <Textarea
              ref={registerInvalidRef}
              value={form.customerNote}
              onChange={(event) => updateField("customerNote", event.currentTarget.value)}
              aria-invalid={Boolean(errors.customerNote)}
            />
          </Field>
          <input
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(event) => updateField("website", event.currentTarget.value)}
            aria-hidden="true"
          />
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <input
              ref={registerInvalidRef}
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(event) => updateField("termsAccepted", event.currentTarget.checked)}
              aria-invalid={Boolean(errors.termsAccepted)}
              className="mt-1 size-4"
            />
            <span>
              J&apos;accepte les conditions de livraison et de retour.
              <span className="block text-muted-foreground">
                Les frais de livraison, la disponibilité finale et les modalités de paiement seront confirmés par l&apos;équipe.
              </span>
              {errors.termsAccepted ? <span className="block text-destructive">{errors.termsAccepted}</span> : null}
            </span>
          </label>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={checkoutBlocked} aria-describedby="checkout-disabled-help">
            {status === "success"
              ? "Commande enregistrée"
              : status === "submitting"
                ? "Création de la commande..."
                : "Envoyer la commande"}
          </Button>
          <Link href="/panier" className={buttonVariants({ variant: "outline" })}>
            Retour au panier
          </Link>
        </div>
        {checkoutBlocked ? (
          <p id="checkout-disabled-help" className="text-sm text-muted-foreground">
            {checkoutDisabledReason}
          </p>
        ) : null}
      </form>

      <aside className="h-fit rounded-lg border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="font-heading text-3xl">Résumé</h2>
        <div className="mt-4 grid gap-4">
          {status === "validating" ? (
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              Vérification du panier...
            </p>
          ) : null}
          {orderableLines.map((line) => (
            <SummaryLine key={line.variantId} line={line} />
          ))}
        </div>
        <div className="mt-5 grid gap-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span>Sous-total</span>
            <span>{formatXof(snapshot?.subtotalXof ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Frais de livraison</span>
            <span>À confirmer</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>À confirmer</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const id = useMemo(() => label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), [label]);
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {React.cloneElement(children, {
        id,
        "aria-describedby": error ? errorId : children.props["aria-describedby"],
      })}
      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function PaymentInstructions({
  method,
  settings,
}: {
  method: PaymentMethod;
  settings: CheckoutPageClientProps["settings"];
}) {
  const instructions = paymentInstructionForMethod(method, settings);
  const merchantNumber = merchantNumberForPaymentMethod(method, settings);
  if (paymentMethodIsMobileMoney(method) && !merchantNumber) {
    return (
      <p className="text-sm text-muted-foreground">
        Les instructions {configuredPaymentMethodLabel(method, settings)} seront confirmées par l&apos;équipe.
      </p>
    );
  }
  if (!instructions) return null;
  return (
    <div className="rounded-lg bg-surface-muted p-3 text-sm text-muted-foreground">
      {instructions.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

function SummaryLine({ line }: { line: ReconciledCartLine }) {
  return (
    <article className="grid grid-cols-[4rem_1fr] gap-3">
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
        {line.imageUrl ? <Image src={line.imageUrl} alt={line.imageAlt} fill sizes="64px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0 text-sm">
        <p className="font-medium">{line.productName}</p>
        <p className="text-muted-foreground">{line.variantLabel}</p>
        <p>{line.unitPriceXof ? formatXof(line.unitPriceXof) : "Prix indisponible"} x {line.adjustedQuantity}</p>
        <p className={line.orderable ? "text-muted-foreground" : "text-destructive"}>{availabilityLabel(line)}</p>
        {line.orderable && line.unitPriceXof ? (
          <p className="font-medium">{formatXof(line.unitPriceXof * line.adjustedQuantity)}</p>
        ) : null}
      </div>
    </article>
  );
}
