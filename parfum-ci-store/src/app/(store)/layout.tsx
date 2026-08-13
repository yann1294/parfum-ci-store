import { Suspense } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { AttributionCapture } from "@/components/storefront/attribution-capture";
import { getPublicStoreSettings } from "@/lib/settings/service";

export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getPublicStoreSettings();
  if (settings.maintenanceMode) {
    return <div className="flex min-h-screen items-center justify-center bg-background px-4"><main id="contenu" className="w-full max-w-xl rounded-lg border bg-surface p-8 text-center"><p className="text-sm font-medium text-muted-foreground">{settings.storeName}</p><h1 className="mt-2 font-heading text-5xl">Maintenance en cours</h1><p className="mt-4 text-muted-foreground">{settings.maintenanceMessage || "La boutique sera de nouveau disponible prochainement."}</p>{settings.expectedReopeningAt ? <p className="mt-3 text-sm text-muted-foreground">Réouverture prévue: {new Date(settings.expectedReopeningAt).toLocaleString("fr-FR")}</p> : null}</main></div>;
  }
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
