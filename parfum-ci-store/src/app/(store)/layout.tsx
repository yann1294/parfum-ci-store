import { Suspense } from "react";

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { AttributionCapture } from "@/components/storefront/attribution-capture";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
