import { PageContainer } from "@/components/shared/page-container";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { getSafeReturnPath } from "@/lib/auth/redirects";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ retour?: string; erreur?: string }>;
}) {
  const params = await searchParams;
  const returnPath = getSafeReturnPath(params?.retour);
  const errorMessage =
    params?.erreur === "oauth"
      ? "La connexion Google a échoué. Réessayez ou utilisez votre mot de passe."
      : null;

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
            {errorMessage ? (
              <p className="mb-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
            <LoginForm returnPath={returnPath} />
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
