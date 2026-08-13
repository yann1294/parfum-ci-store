import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { CartPageClient } from "@/components/storefront/cart-page-client";
import { getPublicStoreSettings } from "@/lib/settings/service";

export const metadata: Metadata = {
  title: "Panier",
  robots: { index: false, follow: true },
};

export default async function CartPage() {
  const settings = await getPublicStoreSettings();
  return (
    <PageContainer className="py-12">
      <CartPageClient whatsappNumber={settings.whatsappNumber ?? undefined} />
    </PageContainer>
  );
}
