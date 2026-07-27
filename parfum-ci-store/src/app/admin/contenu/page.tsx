import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContentEditor } from "@/components/admin/content/content-editor";
import { PaymentSettingsEditor } from "@/components/admin/content/payment-settings-editor";
import { requireRole } from "@/lib/auth/server";
import { getPaymentSettings } from "@/lib/orders/payment-settings";
import { getStorefrontContent } from "@/lib/storefront/content";

export default async function AdminContentPage() {
  await requireRole(["OWNER", "ADMIN"], { mode: "redirect", returnPath: "/admin/contenu" });
  const [content, paymentSettings] = await Promise.all([getStorefrontContent(), getPaymentSettings()]);

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Back-office"
        title="Contenu public"
        description="Gérez les textes publics de l'accueil, des pages d'information, des coordonnées et des réseaux sociaux."
      />
      <div className="mt-8 grid gap-8">
        <ContentEditor content={content} />
        <PaymentSettingsEditor configs={paymentSettings.configs} />
      </div>
    </PageContainer>
  );
}
