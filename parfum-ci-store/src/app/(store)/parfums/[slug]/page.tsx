import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ProductCard } from "@/components/storefront/product-card";
import { ProductDetailClient } from "@/components/storefront/product-detail-client";
import { getActiveProductBySlug, listRelatedProducts } from "@/lib/catalogue/products";
import { absoluteUrl, siteConfig } from "@/config/site";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);

  if (!product) {
    return { title: "Parfum introuvable", robots: { index: false, follow: true } };
  }

  const image = product.images[0];
  const description = product.shortDescription ?? product.description ?? siteConfig.description;
  const url = `/parfums/${product.slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: product.name,
      description,
      url,
      images: image?.publicUrl ? [{ url: image.publicUrl, alt: image.altText }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image?.publicUrl ? [image.publicUrl] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();
  const related = await listRelatedProducts(product, 4);
  const minPrice = Math.min(...product.variants.map((variant) => variant.priceXof));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? product.shortDescription ?? product.name,
    image: product.images.map((image) => image.publicUrl).filter(Boolean),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    sku: product.variants[0]?.sku,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "XOF",
      lowPrice: minPrice,
      offerCount: product.variants.length,
      availability: product.variants.some((variant) => variant.availableQuantity > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/parfums/${product.slug}`),
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <PageContainer className="py-10">
      <nav aria-label="Fil d'Ariane" className="mb-6 text-sm text-muted-foreground">
        <Link href="/catalogue">Catalogue</Link> / <span className="text-foreground">{product.name}</span>
      </nav>
      <ProductDetailClient product={product} />
      <section className="mt-12 grid gap-6">
        <SectionHeading eyebrow="Notes" title="Composition olfactive" />
        <div className="grid gap-4 md:grid-cols-3">
          <NoteBlock title="Notes de tête" notes={product.topNotes} />
          <NoteBlock title="Notes de coeur" notes={product.heartNotes} />
          <NoteBlock title="Notes de fond" notes={product.baseNotes} />
        </div>
      </section>
      <section className="mt-12 rounded-lg border bg-surface p-5">
        <h2 className="font-heading text-3xl">Livraison et paiement</h2>
        <p className="mt-3 text-sm text-muted-foreground">{siteConfig.deliveryCopy}</p>
        <p className="mt-2 text-sm text-muted-foreground">{siteConfig.paymentCopy}</p>
      </section>
      <section className="mt-12 grid gap-6">
        <SectionHeading eyebrow="À découvrir" title="Parfums associés" />
        {related.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => <ProductCard key={item.id} product={item} />)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune recommandation disponible pour le moment.</p>
        )}
      </section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </PageContainer>
  );
}

function NoteBlock({ title, notes }: { title: string; notes: string[] }) {
  return (
    <div className="rounded-lg border bg-surface p-4">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{notes.length > 0 ? notes.join(", ") : "Non renseignées"}</p>
    </div>
  );
}
