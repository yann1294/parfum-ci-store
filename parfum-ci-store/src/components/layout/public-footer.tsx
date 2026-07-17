import Link from "next/link";

import { buildSocialLinks, siteConfig } from "@/config/site";
import { getStorefrontContent } from "@/lib/storefront/content";

export async function PublicFooter() {
  const content = await getStorefrontContent();
  const socialLinks = buildSocialLinks({
    instagramUrl: content.social.instagramUrl || undefined,
    facebookUrl: content.social.facebookUrl || undefined,
    tiktokUrl: content.social.tiktokUrl || undefined,
    whatsappNumber: content.social.whatsappNumber || siteConfig.whatsappNumber,
  });

  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-heading text-2xl font-semibold">{siteConfig.name}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Plateforme e-commerce et opérations pour une parfumerie premium en Côte d&apos;Ivoire.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {socialLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                target="_blank"
                rel="noreferrer"
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="sr-only">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
