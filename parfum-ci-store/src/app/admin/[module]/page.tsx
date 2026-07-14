import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";

const moduleContent: Record<string, { title: string; description: string }> = {
  catalogue: {
    title: "Catalogue",
    description:
      "Module réservé au personnel autorisé. Les opérations métier seront ajoutées plus tard.",
  },
  inventaire: {
    title: "Inventaire",
    description: "Module réservé au personnel autorisé. Aucun mouvement de stock n'est exposé ici.",
  },
  commandes: {
    title: "Commandes",
    description:
      "Module réservé au personnel autorisé. Les données de commande ne sont pas encore connectées.",
  },
  clients: {
    title: "Clients",
    description:
      "Module réservé au personnel autorisé. Les données client ne sont pas encore connectées.",
  },
  paiements: {
    title: "Paiements",
    description:
      "Module réservé au personnel autorisé. La vérification de paiement n'est pas encore connectée.",
  },
  messages: {
    title: "Messages",
    description:
      "Module réservé au personnel autorisé. La boîte de réception sera connectée plus tard.",
  },
  analytics: {
    title: "Analytics",
    description:
      "Module réservé au personnel autorisé. Les indicateurs seront connectés plus tard.",
  },
  parametres: {
    title: "Paramètres",
    description: "Module réservé au personnel autorisé. Les réglages seront connectés plus tard.",
  },
};

export default async function AdminModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  const content = moduleContent[module];

  if (!content) {
    notFound();
  }

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Administration"
        title={content.title}
        description={content.description}
      />
      <div className="mt-8">
        <EmptyState
          title="Module en préparation"
          description="L'accès est protégé; aucune opération métier n'est disponible sur cette page temporaire."
        />
      </div>
    </PageContainer>
  );
}
