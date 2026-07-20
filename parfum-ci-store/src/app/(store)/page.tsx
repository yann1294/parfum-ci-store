import Link from "next/link";
import type { Metadata } from "next";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/storefront/product-card";
import { listFeaturedProducts, listHomeFragranceFamilyFacets } from "@/lib/catalogue/products";
import { buildWhatsAppUrlForNumber, normalizeWhatsAppNumber, siteConfig } from "@/config/site";
import { getStorefrontContent } from "@/lib/storefront/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.home.seoTitle || "Parfumerie premium en Côte d'Ivoire",
    description: content.home.seoDescription || content.home.heroSubtitle,
    alternates: { canonical: "/" },
  };
}

export default async function HomePage() {
  const [featured, familyFacets, content] = await Promise.all([
    listFeaturedProducts(4),
    listHomeFragranceFamilyFacets(6),
    getStorefrontContent(),
  ]);
  const whatsappUrl = buildWhatsAppUrlForNumber(
    normalizeWhatsAppNumber(content.social.whatsappNumber) ?? siteConfig.whatsappNumber,
    siteConfig.whatsappDefaultText,
  );

  return (
    <PageContainer className="py-12 md:py-16">
      <section className="grid gap-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="max-w-2xl space-y-7">
          <Badge variant="secondary">Parfumerie en Côte d&apos;Ivoire</Badge>
          <div className="space-y-5">
            <h1 className="font-heading text-5xl font-semibold leading-none text-foreground md:text-7xl">
              {content.home.heroTitle}
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">{content.home.heroSubtitle}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/catalogue" className={buttonVariants({ size: "lg" })}>
              {content.home.primaryCtaLabel}
            </Link>
            {whatsappUrl ? (
              <Link href={whatsappUrl} className={buttonVariants({ variant: "outline", size: "lg" })} target="_blank">
                {content.home.secondaryCtaLabel || "Écrire sur WhatsApp"}
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

      {familyFacets.length >= 3 ? (
        <section className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-1">
            <SectionHeading
              eyebrow="Découvrir"
              title="Découvrir par famille olfactive"
              description="La catégorie organise le catalogue. La famille olfactive décrit le caractère du parfum."
            />
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            {familyFacets.map((facet) => (
              <Link key={facet.family} href={facet.href} className={buttonVariants({ variant: "outline" })}>
                {facet.family} · {facet.count}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-16 grid gap-5 md:grid-cols-3">
        {content.home.trustPoints.map((point) => (
          <div key={point.title} className="rounded-lg border bg-surface p-5">
            <p className="font-medium">{point.title}</p>
            {point.description ? <p className="mt-2 text-sm text-muted-foreground">{point.description}</p> : null}
          </div>
        ))}
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <SectionHeading eyebrow="Commande" title="Comment commander" />
        <ol className="grid gap-3">
          {content.home.orderingSteps.map((step, index) => (
            <li key={step.title} className="rounded-lg border bg-surface p-4">
              <span className="font-medium">{index + 1}. </span>
              <span className="font-medium">{step.title}</span>
              {step.description ? <p className="mt-1 text-sm text-muted-foreground">{step.description}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </PageContainer>
  );
}
