import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { buildSocialLinks, buildWhatsAppUrlForNumber, normalizeWhatsAppNumber, siteConfig } from "@/config/site";
import { getStorefrontContent } from "@/lib/storefront/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.contact.seoTitle || content.contact.pageTitle,
    description: content.contact.seoDescription || content.contact.introText,
    alternates: { canonical: "/contact" },
  };
}

export default async function ContactPage() {
  const content = await getStorefrontContent();
  const contact = content.contact;
  const whatsappNumber = normalizeWhatsAppNumber(contact.whatsappNumber) ?? normalizeWhatsAppNumber(content.social.whatsappNumber) ?? siteConfig.whatsappNumber;
  const whatsappUrl = buildWhatsAppUrlForNumber(whatsappNumber, siteConfig.whatsappDefaultText);
  const socialLinks = buildSocialLinks({
    instagramUrl: content.social.instagramUrl || undefined,
    facebookUrl: content.social.facebookUrl || undefined,
    tiktokUrl: content.social.tiktokUrl || undefined,
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
          <Link href={whatsappUrl} className={buttonVariants({ size: "lg" })} target="_blank" rel="noreferrer">
            {contact.whatsappCtaLabel}
          </Link>
        ) : null}
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {contact.emailCtaLabel}
          </a>
        ) : null}
        {contact.telephone ? (
          <a href={`tel:${contact.telephone.replace(/\s/g, "")}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            {contact.phoneCtaLabel}
          </a>
        ) : null}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {contact.address ? (
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="font-heading text-3xl">Adresse</h2>
            <p className="mt-2 text-muted-foreground">{contact.address}</p>
            {contact.mapUrl ? (
              <Link href={contact.mapUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium underline">
                Ouvrir la carte
              </Link>
            ) : null}
          </section>
        ) : null}
        {contact.openingHours.length > 0 ? (
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="font-heading text-3xl">Horaires</h2>
            <dl className="mt-2 grid gap-2 text-sm">
              {contact.openingHours.map((item) => (
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
            <Link key={link.label} href={link.href} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
