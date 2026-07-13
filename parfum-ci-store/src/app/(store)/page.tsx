import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <PageContainer className="py-14 md:py-20">
      <section className="grid gap-10 md:grid-cols-[1.08fr_0.92fr] md:items-center">
        <div className="max-w-2xl space-y-7">
          <Badge variant="secondary">Bientôt disponible à Abidjan</Badge>
          <div className="space-y-5">
            <h1 className="text-5xl font-semibold leading-none tracking-normal text-foreground md:text-7xl">
              Parfums raffinés, sélectionnés pour la Côte d&apos;Ivoire.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground">
              Une base visuelle prête pour une boutique premium, avec paiement Mobile Money manuel,
              livraison locale et expérience française dès le départ.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/catalogue" className={buttonVariants({ size: "lg" })}>
              Découvrir le catalogue
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Nous contacter
            </Link>
          </div>
        </div>
        <Card className="overflow-hidden border-border bg-surface p-0 shadow-sm">
          <CardContent className="p-0">
            <div className="aspect-[4/5] bg-[radial-gradient(circle_at_35%_25%,var(--brand-soft),transparent_32%),linear-gradient(145deg,var(--surface-muted),var(--surface))] p-8">
              <div className="flex h-full flex-col justify-end rounded-lg border border-border bg-surface/80 p-6 shadow-sm">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Collection signature
                </p>
                <p className="mt-3 font-heading text-4xl font-semibold text-foreground">
                  Notes boisées, florales et ambrées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 space-y-8">
        <SectionHeading
          eyebrow="Fondations"
          title="Une interface prête pour les pages métier"
          description="Les composants, tokens et shells sont installés avant la création du catalogue, du panier et de l'administration."
        />
        <EmptyState
          title="Aucune donnée produit pour le moment"
          description="Les pages utilisent des contenus temporaires en français. Les intégrations Supabase seront ajoutées dans une étape séparée."
          action={<Button variant="secondary">Voir les règles visuelles</Button>}
        />
      </section>
    </PageContainer>
  );
}
