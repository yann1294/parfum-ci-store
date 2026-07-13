import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <main id="contenu" className="min-h-screen bg-background py-12">
      <PageContainer className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Connexion admin</CardTitle>
            <CardDescription>
              Écran temporaire. L&apos;authentification Supabase sera branchée plus tard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" type="email" placeholder="admin@parfum.ci" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" />
              </div>
              <Button type="button">Continuer</Button>
            </form>
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}
