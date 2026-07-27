import "server-only";

import { siteConfig } from "@/config/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStorefrontContent } from "@/lib/storefront/content";
import type { DeliveryMethod, PaymentMethod, PaymentInstructionSettings } from "@/lib/orders/display";

type StoreSettingsRow = {
  store_name: string | null;
  legal_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  whatsapp_number: string | null;
  orange_money_number: string | null;
  mtn_momo_number: string | null;
  wave_number: string | null;
  moov_money_number: string | null;
  delivery_information: string | null;
  enabled_payment_methods: PaymentMethod[] | null;
  enabled_delivery_methods: string[] | null;
};

type StoreSettingsClient = {
  from(table: "store_settings"): {
    select(columns: string): {
      eq(column: "id", value: true): {
        maybeSingle(): Promise<{ data: StoreSettingsRow | null; error: { code?: string; message?: string } | null }>;
      };
    };
  };
};

export type PublicCheckoutSettings = PaymentInstructionSettings & {
  enabledPaymentMethods: PaymentMethod[];
  enabledDeliveryMethods: DeliveryMethod[];
};

const paymentMethods: PaymentMethod[] = [
  "CASH_ON_DELIVERY",
  "ORANGE_MONEY",
  "MTN_MOMO",
  "WAVE",
  "MOOV_MONEY",
  "BANK_TRANSFER",
  "PAY_IN_STORE",
];

const deliveryMethods: DeliveryMethod[] = ["HOME_DELIVERY", "PICKUP"];

function filterPaymentMethods(input: PaymentMethod[] | null | undefined) {
  const enabled = (input ?? []).filter((value): value is PaymentMethod =>
    paymentMethods.includes(value as PaymentMethod),
  );
  return enabled.length > 0 ? enabled : (["CASH_ON_DELIVERY"] satisfies PaymentMethod[]);
}

function filterDeliveryMethods(input: string[] | null | undefined) {
  const enabled = (input ?? []).filter((value): value is DeliveryMethod =>
    deliveryMethods.includes(value as DeliveryMethod),
  );
  return enabled.length > 0 ? enabled : (["HOME_DELIVERY"] satisfies DeliveryMethod[]);
}

export async function getPublicCheckoutSettings(): Promise<PublicCheckoutSettings> {
  const content = await getStorefrontContent();
  const fallback: PublicCheckoutSettings = {
    storeName: siteConfig.name,
    legalName: null,
    contactEmail: content.contact.email || siteConfig.contactEmail,
    contactPhone: content.contact.telephone || null,
    whatsappNumber: content.social.whatsappNumber || siteConfig.whatsappNumber,
    orangeMoneyNumber: null,
    mtnMomoNumber: null,
    waveNumber: null,
    moovMoneyNumber: null,
    deliveryInformation: siteConfig.deliveryCopy,
    deliveryContent: {
      mobileMoneyDescription: content.delivery.mobileMoneyDescription,
      cashOnDeliveryConditions: content.delivery.cashOnDeliveryConditions,
      pickupInformation: content.delivery.pickupInformation,
      orderConfirmationProcess: content.delivery.orderConfirmationProcess,
    },
    enabledPaymentMethods: ["CASH_ON_DELIVERY"],
    enabledDeliveryMethods: ["HOME_DELIVERY"],
  };

  try {
    const supabase = (await createSupabaseServerClient()) as unknown as StoreSettingsClient;
    const { data, error } = await supabase
      .from("store_settings")
      .select(
        "store_name, legal_name, contact_email, contact_phone, whatsapp_number, orange_money_number, mtn_momo_number, wave_number, moov_money_number, delivery_information, enabled_payment_methods, enabled_delivery_methods",
      )
      .eq("id", true)
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      ...fallback,
      storeName: data.store_name || fallback.storeName,
      legalName: data.legal_name,
      contactEmail: data.contact_email || fallback.contactEmail,
      contactPhone: data.contact_phone || fallback.contactPhone,
      whatsappNumber: data.whatsapp_number || fallback.whatsappNumber,
      orangeMoneyNumber: data.orange_money_number,
      mtnMomoNumber: data.mtn_momo_number,
      waveNumber: data.wave_number,
      moovMoneyNumber: data.moov_money_number,
      deliveryInformation: data.delivery_information || fallback.deliveryInformation,
      enabledPaymentMethods: filterPaymentMethods(data.enabled_payment_methods),
      enabledDeliveryMethods: filterDeliveryMethods(data.enabled_delivery_methods),
    };
  } catch {
    return fallback;
  }
}

