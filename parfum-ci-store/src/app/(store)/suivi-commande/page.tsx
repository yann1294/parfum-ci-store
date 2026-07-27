import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { OrderTrackingClient } from "@/components/storefront/order-tracking-client";

export const metadata: Metadata = {
  title: "Suivre ma commande",
  robots: { index: false, follow: false },
};

export default function OrderTrackingPage() {
  return (
    <PageContainer className="py-12">
      <OrderTrackingClient />
    </PageContainer>
  );
}

