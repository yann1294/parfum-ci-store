import { PageContainer } from "@/components/shared/page-container";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getSafeReturnPath } from "@/lib/auth/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ retour?: string }>;
}) {
  const params = await searchParams;
  const returnPath = getSafeReturnPath(params?.retour);

  return (
    <main id="contenu" className="min-h-screen bg-background py-12">
      <PageContainer className="max-w-md">
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-semibold">Connexion admin</h1>
            <CardDescription>
              Connectez-vous avec votre email et votre mot de passe administrateur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm returnPath={returnPath} />
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
