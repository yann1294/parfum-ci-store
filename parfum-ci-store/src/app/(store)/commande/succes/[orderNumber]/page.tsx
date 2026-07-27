import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { OrderConfirmationClient } from "@/components/storefront/order-confirmation-client";
import { getPublicCheckoutSettings } from "@/lib/orders/checkout-settings";

export const metadata: Metadata = {
  title: "Commande reçue",
  robots: { index: false, follow: false },
};

export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const [{ orderNumber }, settings] = await Promise.all([params, getPublicCheckoutSettings()]);
  return (
    <PageContainer className="py-12">
      <OrderConfirmationClient orderNumber={decodeURIComponent(orderNumber)} settings={settings} />
    </PageContainer>
  );
}

