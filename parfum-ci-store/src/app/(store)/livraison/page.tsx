import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getStorefrontContent } from "@/lib/storefront/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.delivery.seoTitle || content.delivery.pageTitle,
    description: content.delivery.seoDescription || content.delivery.introText,
    alternates: { canonical: "/livraison" },
  };
}

export default async function DeliveryPage() {
  const { delivery } = await getStorefrontContent();
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Livraison"
        title={delivery.pageTitle}
        description={delivery.introText || undefined}
      />
      <div className="mt-8 grid gap-5">
        {delivery.zones.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="font-heading text-3xl">Zones de livraison</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {delivery.zones.map((zone) => (
                <article key={zone.name} className="rounded-lg border bg-surface p-5">
                  <h3 className="font-medium">{zone.name}</h3>
                  {zone.description ? <p className="mt-2 text-sm text-muted-foreground">{zone.description}</p> : null}
                  <dl className="mt-3 grid gap-1 text-sm">
                    {zone.fee ? <div><dt className="text-muted-foreground">Frais</dt><dd>{zone.fee}</dd></div> : null}
                    {zone.timeframe ? <div><dt className="text-muted-foreground">Délai</dt><dd>{zone.timeframe}</dd></div> : null}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <section className="grid gap-4 md:grid-cols-2">
          {delivery.freeDeliveryConditions ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Livraison offerte</h2>
              <p className="mt-3 text-muted-foreground">{delivery.freeDeliveryConditions}</p>
            </div>
          ) : null}
          {delivery.pickupInformation ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Retrait</h2>
              <p className="mt-3 text-muted-foreground">{delivery.pickupInformation}</p>
            </div>
          ) : null}
          {delivery.mobileMoneyDescription ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Mobile Money</h2>
              <p className="mt-3 text-muted-foreground">{delivery.mobileMoneyDescription}</p>
            </div>
          ) : null}
          {delivery.cashOnDeliveryConditions ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Paiement à la livraison</h2>
              <p className="mt-3 text-muted-foreground">{delivery.cashOnDeliveryConditions}</p>
            </div>
          ) : null}
        </section>
        {delivery.orderConfirmationProcess ? (
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="font-heading text-3xl">Confirmation</h2>
            <p className="mt-3 text-muted-foreground">{delivery.orderConfirmationProcess}</p>
          </section>
        ) : null}
        {delivery.faq.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="font-heading text-3xl">Questions fréquentes</h2>
            {delivery.faq.map((item) => (
              <article key={item.question} className="rounded-lg border bg-surface p-5">
                <h3 className="font-medium">{item.question}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
