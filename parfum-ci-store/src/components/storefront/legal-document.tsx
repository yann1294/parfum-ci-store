import type { ReactNode } from "react";

import { PageContainer } from "@/components/shared/page-container";

type LegalDocumentProps = {
  eyebrow: string;
  title: string;
  description: string;
  version: string;
  notice?: ReactNode;
  children: ReactNode;
};

export function LegalDocument({
  eyebrow,
  title,
  description,
  version,
  notice,
  children,
}: LegalDocumentProps) {
  return (
    <PageContainer className="py-12">
      <article className="mx-auto max-w-4xl">
        <header className="border-b pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">{description}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Version publiée le <time dateTime={version}>{formatLegalDate(version)}</time>
          </p>
        </header>

        {notice ? (
          <aside className="mt-8 rounded-lg border border-warning/40 bg-warning/10 p-5" role="note">
            {notice}
          </aside>
        ) : null}

        <div className="mt-10 space-y-10 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:font-semibold [&_h3]:font-heading [&_h3]:text-2xl [&_li]:leading-7 [&_p]:leading-7 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
          {children}
        </div>
      </article>
    </PageContainer>
  );
}

function formatLegalDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeZone: "Africa/Abidjan",
  }).format(new Date(`${value}T00:00:00Z`));
}
