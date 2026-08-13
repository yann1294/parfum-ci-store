import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getStorefrontContent } from "@/lib/storefront/content";
import { getPublicDeliveryZones, getPublicStoreSettings } from "@/lib/settings/service";
import { formatXof } from "@/lib/catalogue/format";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.delivery.seoTitle || content.delivery.pageTitle,
    description: content.delivery.seoDescription || content.delivery.introText,
    alternates: { canonical: "/livraison" },
  };
}

export default async function DeliveryPage() {
  const [{ delivery }, settings, zones] = await Promise.all([getStorefrontContent(), getPublicStoreSettings(), getPublicDeliveryZones()]);
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Livraison"
        title={delivery.pageTitle}
        description={delivery.introText || undefined}
      />
      <div className="mt-8 grid gap-5">
        {zones.length > 0 ? (
          <section className="grid gap-4">
            <h2 className="font-heading text-3xl">Zones de livraison</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {zones.map((zone) => (
                <article key={`${zone.city}-${zone.commune}`} className="rounded-lg border bg-surface p-5">
                  <h3 className="font-medium">{zone.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{zone.city} · {zone.commune}</p>
                  <dl className="mt-3 grid gap-1 text-sm">
                    <div><dt className="text-muted-foreground">Frais</dt><dd>{formatXof(zone.feeXof)}</dd></div>
                    {zone.estimatedMinDays !== null || zone.estimatedMaxDays !== null ? <div><dt className="text-muted-foreground">Délai</dt><dd>{zone.estimatedMinDays ?? zone.estimatedMaxDays}–{zone.estimatedMaxDays ?? zone.estimatedMinDays} jours</dd></div> : null}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ) : null}
        <section className="grid gap-4 md:grid-cols-2">
          {settings.freeDeliveryEnabled && settings.freeDeliveryThresholdXof !== null ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Livraison offerte</h2>
              <p className="mt-3 text-muted-foreground">À partir de {formatXof(settings.freeDeliveryThresholdXof)} pour la livraison à domicile.</p>
            </div>
          ) : null}
          {delivery.pickupInformation ? (
            <div className="rounded-lg border bg-surface p-5">
              <h2 className="font-heading text-3xl">Retrait</h2>
              <p className="mt-3 text-muted-foreground">{delivery.pickupInformation}</p>
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
