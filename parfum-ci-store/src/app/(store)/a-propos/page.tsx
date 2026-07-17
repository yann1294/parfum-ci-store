import type { Metadata } from "next";

import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { getStorefrontContent } from "@/lib/storefront/content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getStorefrontContent();
  return {
    title: content.about.seoTitle || content.about.pageTitle,
    description: content.about.seoDescription || content.about.introText,
    alternates: { canonical: "/a-propos" },
  };
}

export default async function AboutPage() {
  const { about } = await getStorefrontContent();
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="À propos"
        title={about.pageTitle}
        description={about.introText || undefined}
      />
      <div className="mt-8 max-w-3xl space-y-4 text-muted-foreground">
        {about.brandStory ? <p>{about.brandStory}</p> : null}
        {about.mission ? <p>{about.mission}</p> : null}
        {about.values.length > 0 ? (
          <ul className="grid gap-2">
            {about.values.map((value) => (
              <li key={value} className="rounded-lg border bg-surface p-3 text-foreground">
                {value}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PageContainer>
  );
}
