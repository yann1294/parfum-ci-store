import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { ContentEditor } from "@/components/admin/content/content-editor";
import { requireRole } from "@/lib/auth/server";
import { getStorefrontContent } from "@/lib/storefront/content";

export default async function AdminContentPage() {
  await requireRole(["OWNER", "ADMIN"], { mode: "redirect", returnPath: "/admin/contenu" });
  const content = await getStorefrontContent();

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Back-office"
        title="Contenu public"
        description="Gérez les textes publics de l'accueil, des pages d'information, des coordonnées et des réseaux sociaux."
      />
      <div className="mt-8">
        <ContentEditor content={content} />
      </div>
    </PageContainer>
  );
}

