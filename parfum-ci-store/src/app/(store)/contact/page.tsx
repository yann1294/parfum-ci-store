import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContactMessageForm } from "@/components/storefront/contact-message-form";
import { buttonVariants } from "@/components/ui/button";
import { buildSocialLinks, buildWhatsAppUrlForNumber, normalizeWhatsAppNumber, siteConfig } from "@/config/site";
import { getStorefrontContent } from "@/lib/storefront/content";
import { getPublicStoreSettings } from "@/lib/settings/service";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.contact.seoTitle || content.contact.pageTitle,
    description: content.contact.seoDescription || content.contact.introText,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const [content, settings] = await Promise.all([getStorefrontContent(), getPublicStoreSettings()]);
  const contact = content.contact;
  const whatsappNumber = normalizeWhatsAppNumber(settings.whatsappNumber ?? undefined);
  const whatsappUrl = buildWhatsAppUrlForNumber(whatsappNumber, siteConfig.whatsappDefaultText);
  const socialLinks = buildSocialLinks({
    instagramUrl: settings.socialLinks.instagram,
    facebookUrl: settings.socialLinks.facebook,
    tiktokUrl: settings.socialLinks.tiktok,
    whatsappNumber,
  });

  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Contact"
        title={contact.pageTitle}
        description={contact.introText || undefined}
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {whatsappUrl ? (
          <Link href={whatsappUrl} className={buttonVariants({ size: "lg" })} target="_blank" rel="noopener noreferrer">
            {contact.whatsappCtaLabel}
          </Link>
        ) : null}
        {settings.supportEmail || settings.contactEmail ? (
          <a href={`mailto:${settings.supportEmail ?? settings.contactEmail}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {contact.emailCtaLabel}
          </a>
        ) : null}
        {settings.contactPhone ? (
          <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {contact.phoneCtaLabel}
          </a>
        ) : null}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {settings.primaryAddress ? (
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="font-heading text-3xl">Adresse</h2>
            <p className="mt-2 text-muted-foreground">{settings.primaryAddress}</p>
            {settings.secondaryAddress ? <p className="mt-1 text-muted-foreground">{settings.secondaryAddress}</p> : null}
            {contact.mapUrl ? (
              <Link href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-medium underline">
                Ouvrir la carte
              </Link>
            ) : null}
          </section>
        ) : null}
        {settings.businessHours.length > 0 ? (
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="font-heading text-3xl">Horaires</h2>
            <dl className="mt-2 grid gap-2 text-sm">
              {settings.businessHours.map((item) => (
                <div key={`${item.label}-${item.value}`} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
      </div>
      {socialLinks.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3" aria-label="Réseaux sociaux">
          {socialLinks.map((link) => (
            <Link key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
      {settings.responseTimeGuidance ? <p className="mt-4 text-sm text-muted-foreground">{settings.responseTimeGuidance}</p> : null}
      <div className="mt-10">
        <ContactMessageForm
          productContext={{
            productId: params.productId,
            variantId: params.variantId,
            productSlug: params.productSlug,
          }}
        />
      </div>
    </PageContainer>
  );
}
