import { SettingsEditor } from "@/components/admin/settings/settings-editor";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { requireRole } from "@/lib/auth/server";
import { getAdminStoreSettings } from "@/lib/settings/service";

export default async function AdminSettingsPage() {
  await requireRole(["OWNER", "ADMIN"], { mode: "redirect", returnPath: "/admin/parametres" });
  const settings = await getAdminStoreSettings();
  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Back-office"
        title="Paramètres de la boutique"
        description="Configuration opérationnelle structurée. Les textes éditoriaux restent dans Contenu public."
      />
      <div className="mt-8">
        <SettingsEditor initialSettings={settings} />
      </div>
    </PageContainer>
  );
}
