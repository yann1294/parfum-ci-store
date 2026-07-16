import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { CartPageClient } from "@/components/storefront/cart-page-client";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PageContainer className="py-12">
      <CartPageClient />
    </PageContainer>
  );
}
