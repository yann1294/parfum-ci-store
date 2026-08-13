import Link from "next/link";

import { buildSocialLinks } from "@/config/site";
import { getPublicStoreSettings } from "@/lib/settings/service";

export async function PublicFooter() {
  const settings = await getPublicStoreSettings();
  const socialLinks = buildSocialLinks({
    instagramUrl: settings.socialLinks.instagram,
    facebookUrl: settings.socialLinks.facebook,
    tiktokUrl: settings.socialLinks.tiktok,
    whatsappNumber: settings.whatsappNumber,
  });

  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8">
        <div>
          <p className="font-heading text-2xl font-semibold">{settings.storeName}</p>
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
                rel="noopener noreferrer"
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
