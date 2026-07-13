import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const placeholders = ["Maison ivoire", "Boisé intense", "Fleur de cacao"];

export default function CataloguePage() {
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Catalogue"
        title="Sélection temporaire"
        description="Cette page valide la structure visuelle du catalogue. Les produits réels viendront de Supabase plus tard."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {placeholders.map((name, index) => (
          <Card key={name}>
            <CardHeader>
              <div className="mb-4 aspect-[4/3] rounded-md bg-surface-muted" />
              <Badge className="w-fit" variant={index === 0 ? "default" : "secondary"}>
                Aperçu
              </Badge>
              <CardTitle>{name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Emplacement réservé pour une fiche parfum avec variant, stock et prix en XOF.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <LoadingSkeleton label="Chargement visuel du catalogue" />
      </div>
    </PageContainer>
  );
}
