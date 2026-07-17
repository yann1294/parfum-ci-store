import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { CartPageClient } from "@/components/storefront/cart-page-client";
import { getStorefrontContent } from "@/lib/storefront/content";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const content = await getStorefrontContent();
  return (
    <PageContainer className="py-12">
      <CartPageClient whatsappNumber={content.social.whatsappNumber} />
    </PageContainer>
  );
}
