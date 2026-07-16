import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "À propos",
  description: siteConfig.description,
  alternates: { canonical: "/a-propos" },
};

export default function AboutPage() {
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="À propos"
        title={siteConfig.name}
        description="Une expérience publique dédiée à la découverte de parfums premium en français."
      />
      <div className="mt-8 max-w-3xl space-y-4 text-muted-foreground">
        <p>{siteConfig.description}</p>
        <p>
          Les informations de marque, d&apos;adresse et de garanties seront affichées uniquement lorsqu&apos;elles seront
          configurées comme données réelles.
        </p>
      </div>
    </PageContainer>
  );
}
