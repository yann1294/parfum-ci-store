import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { siteConfig } from "@/config/site";
import { getPublicStoreSettings } from "@/lib/settings/service";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicStoreSettings();
  const title = settings.seo.siteTitle || settings.storeName;
  const description = settings.seo.siteDescription || siteConfig.description;
  const base = settings.seo.canonicalSiteUrl || siteConfig.siteUrl;
  return {
    metadataBase: new URL(base),
    title: { default: title, template: `%s | ${settings.storeName}` },
    description,
    openGraph: {
      title,
      description,
      images: settings.seo.ogImageUrl ? [{ url: settings.seo.ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: settings.seo.ogImageUrl ? [settings.seo.ogImageUrl] : undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${cormorant.variable} ${manrope.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#contenu"
            className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
          >
            Aller au contenu principal
          </a>
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
