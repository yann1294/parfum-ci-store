import type { GuestOrderConfirmation } from "@/lib/orders/guest-order-contract";

export type PaymentMethod =
  | "CASH_ON_DELIVERY"
  | "ORANGE_MONEY"
  | "MTN_MOMO"
  | "WAVE"
  | "MOOV_MONEY"
  | "BANK_TRANSFER"
  | "PAY_IN_STORE";

export type DeliveryMethod = "HOME_DELIVERY" | "PICKUP";

export type PaymentInstructionSettings = {
  storeName: string;
  legalName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsappNumber: string | null;
  orangeMoneyNumber: string | null;
  mtnMomoNumber: string | null;
  waveNumber: string | null;
  moovMoneyNumber: string | null;
  deliveryInformation: string | null;
  deliveryContent: {
    mobileMoneyDescription?: string;
    cashOnDeliveryConditions?: string;
    pickupInformation?: string;
    orderConfirmationProcess?: string;
  };
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Paiement à la livraison",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  WAVE: "Wave",
  MOOV_MONEY: "Moov Money",
  BANK_TRANSFER: "Virement bancaire",
  PAY_IN_STORE: "Paiement en boutique",
};

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  HOME_DELIVERY: "Livraison à domicile",
  PICKUP: "Retrait en boutique",
};

export const orderStatusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: "En attente de confirmation",
  CONFIRMED: "Commande confirmée",
  PREPARING: "Préparation en cours",
  READY_FOR_PICKUP: "Prête à être récupérée",
  OUT_FOR_DELIVERY: "En cours de livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  RETURNED: "Retournée",
};

export const paymentStatusLabels: Record<string, string> = {
  UNPAID: "Non payé",
  PENDING: "Paiement en attente de vérification",
  PAID: "Payé",
  FAILED: "Paiement non validé",
  REFUNDED: "Remboursé",
  PARTIALLY_REFUNDED: "Partiellement remboursé",
};

export function orderStatusLabel(value: string | null | undefined) {
  return value ? (orderStatusLabels[value] ?? "Statut en cours de traitement") : "Statut en cours de traitement";
}

export function paymentStatusLabel(value: string | null | undefined) {
  return value ? (paymentStatusLabels[value] ?? "Paiement en cours de traitement") : "Paiement en cours de traitement";
}

export function paymentMethodLabel(value: string | null | undefined) {
  return value && value in paymentMethodLabels
    ? paymentMethodLabels[value as PaymentMethod]
    : "Mode de paiement";
}

export function deliveryMethodLabel(value: string | null | undefined) {
  return value && value in deliveryMethodLabels
    ? deliveryMethodLabels[value as DeliveryMethod]
    : "Mode de livraison";
}

export function paymentMethodIsMobileMoney(value: string | null | undefined) {
  return value === "ORANGE_MONEY" || value === "MTN_MOMO" || value === "WAVE" || value === "MOOV_MONEY";
}

export function merchantNumberForPaymentMethod(
  method: string | null | undefined,
  settings: PaymentInstructionSettings,
) {
  if (method === "ORANGE_MONEY") return settings.orangeMoneyNumber;
  if (method === "MTN_MOMO") return settings.mtnMomoNumber;
  if (method === "WAVE") return settings.waveNumber;
  if (method === "MOOV_MONEY") return settings.moovMoneyNumber;
  return null;
}

export function paymentInstructionForMethod(
  method: string | null | undefined,
  settings: PaymentInstructionSettings,
  orderNumber?: string,
) {
  if (paymentMethodIsMobileMoney(method)) {
    const merchantNumber = merchantNumberForPaymentMethod(method, settings);
    if (!merchantNumber) return null;
    return [
      settings.deliveryContent.mobileMoneyDescription ||
        "Le paiement Mobile Money sera vérifié manuellement par notre équipe.",
      `Numéro marchand: ${merchantNumber}`,
      settings.legalName ? `Bénéficiaire: ${settings.legalName}` : null,
      orderNumber ? `Référence à indiquer si possible: ${orderNumber}` : null,
      "Ne partagez jamais votre PIN, OTP ou code secret.",
    ].filter(Boolean);
  }

  if (method === "CASH_ON_DELIVERY") {
    return [
      settings.deliveryContent.cashOnDeliveryConditions ||
        "Le paiement sera effectué à la livraison selon les conditions confirmées par l'équipe.",
    ];
  }

  if (method === "PAY_IN_STORE") {
    return [
      settings.deliveryContent.pickupInformation ||
        "Le paiement sera effectué en boutique selon les informations confirmées par l'équipe.",
    ];
  }

  if (method === "BANK_TRANSFER") {
    return ["Les instructions de virement seront confirmées par l'équipe avant tout paiement."];
  }

  return null;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `${value.slice(0, 7)} ** ** ** ${digits.slice(-2)}`;
}

export function maskEmail(value: string | null | undefined) {
  if (!value) return "";
  const [local, domain] = value.split("@");
  if (!local || !domain) return "";
  return `${local[0]}***@${domain}`;
}

export type SafeConfirmation = Omit<GuestOrderConfirmation, "orderId"> & {
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
  customerPhone: string;
  customerEmail?: string;
  storedAt: string;
  expiresAt: string;
};

