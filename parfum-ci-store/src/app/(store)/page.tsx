import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { listFeaturedProducts, listPublicFacets } from "@/lib/catalogue/products";
import { buildWhatsAppUrl, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Parfumerie premium en Côte d'Ivoire",
  description: siteConfig.heroDescription,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [featured, facets] = await Promise.all([listFeaturedProducts(4), listPublicFacets()]);
  const whatsappUrl = buildWhatsAppUrl(siteConfig.whatsappDefaultText);

  return (
    <PageContainer className="py-12 md:py-16">
      <section className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="max-w-2xl space-y-7">
          <Badge variant="secondary">Parfumerie en Côte d&apos;Ivoire</Badge>
          <div className="space-y-5">
            <h1 className="font-heading text-5xl font-semibold leading-none text-foreground md:text-7xl">
              {siteConfig.heroTitle}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{siteConfig.heroDescription}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/catalogue" className={buttonVariants({ size: "lg" })}>
              {siteConfig.primaryCta}
            </Link>
            {whatsappUrl ? (
              <Link href={whatsappUrl} className={buttonVariants({ variant: "outline", size: "lg" })} target="_blank">
                Écrire sur WhatsApp
              </Link>
            ) : null}
          </div>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg border bg-surface-muted">
          {featured[0] ? <ProductCard product={featured[0]} priority /> : <div className="h-full bg-surface-muted" />}
        </div>
      </section>

      <section className="mt-16 grid gap-8">
        <SectionHeading eyebrow="Sélection" title="Parfums mis en avant" />
        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} />
            ))}
          </div>
        ) : (
          <EmptyState title="Aucune sélection active" description="Les parfums mis en avant apparaîtront ici après publication." />
        )}
      </section>

      <section className="mt-16 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <SectionHeading eyebrow="Découvrir" title="Explorer par famille" />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          {facets.fragranceFamilies.slice(0, 10).map((family) => (
            <Link key={family} href={`/catalogue?fragranceFamily=${encodeURIComponent(family)}`} className={buttonVariants({ variant: "outline" })}>
              {family}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        {siteConfig.trustPoints.map((point) => (
          <div key={point} className="rounded-lg border bg-surface p-5">
            <p className="font-medium">{point}</p>
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <SectionHeading eyebrow="Commande" title="Comment commander" />
        <ol className="grid gap-3">
          {siteConfig.orderingSteps.map((step, index) => (
            <li key={step} className="rounded-lg border bg-surface p-4">
              <span className="font-medium">{index + 1}. </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  );
}
