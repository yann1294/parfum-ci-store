import Link from "next/link";

import { PageContainer } from "@/components/shared/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <main id="contenu" className="min-h-screen bg-background py-12">
      <PageContainer className="max-w-lg">
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-semibold">Accès refusé</h1>
            <CardDescription>
              Votre compte n&apos;est pas actif ou ne dispose pas des droits nécessaires.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link href="/connexion" className={buttonVariants()}>
              Revenir à la connexion
            </Link>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Aller au site public
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
