import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { CheckoutPageClient } from "@/components/storefront/checkout-page-client";
import { getPublicCheckoutSettings } from "@/lib/orders/checkout-settings";

export const metadata: Metadata = {
  title: "Finaliser ma commande",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const settings = await getPublicCheckoutSettings();
  return (
    <PageContainer className="py-12">
      <CheckoutPageClient settings={settings} />
    </PageContainer>
  );
}

