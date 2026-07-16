import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Livraison",
  description: "Informations de livraison et paiement pour Parfum CI.",
  alternates: { canonical: "/livraison" },
};

export default function DeliveryPage() {
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Livraison"
        title="Livraison et paiement"
        description="Les conditions opérationnelles sont confirmées avant validation de commande."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <section className="rounded-lg border bg-surface p-5">
          <h2 className="font-heading text-3xl">Livraison</h2>
          <p className="mt-3 text-muted-foreground">{siteConfig.deliveryCopy}</p>
        </section>
        <section className="rounded-lg border bg-surface p-5">
          <h2 className="font-heading text-3xl">Paiement</h2>
          <p className="mt-3 text-muted-foreground">{siteConfig.paymentCopy}</p>
        </section>
      </div>
    </PageContainer>
  );
}
