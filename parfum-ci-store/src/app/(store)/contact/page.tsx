import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { buildWhatsAppUrl, siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez Parfum CI pour une demande de parfum.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const whatsappUrl = buildWhatsAppUrl(siteConfig.whatsappDefaultText);

  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Contact"
        title="Nous contacter"
        description="Utilisez les canaux configurés pour demander une disponibilité ou un conseil parfum."
      />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {whatsappUrl ? (
          <Link href={whatsappUrl} className={buttonVariants({ size: "lg" })} target="_blank" rel="noreferrer">
            Écrire sur WhatsApp
          </Link>
        ) : null}
        {siteConfig.contactEmail ? (
          <a href={`mailto:${siteConfig.contactEmail}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            Envoyer un email
          </a>
        ) : null}
      </div>
      {siteConfig.socialLinks.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-3">
          {siteConfig.socialLinks.map((link) => (
            <Link key={link.label} href={link.href} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
