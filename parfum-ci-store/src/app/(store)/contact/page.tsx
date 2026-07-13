import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  return (
    <PageContainer className="py-12">
      <SectionHeading
        eyebrow="Contact"
        title="Parlez-nous de votre besoin"
        description="Formulaire temporaire sans envoi. La messagerie sera connectée à Supabase dans une étape future."
      />
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="Awa Koné" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone ou WhatsApp</Label>
                <Input id="phone" placeholder="+225 07 00 00 00 00" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Je cherche un parfum pour..." />
              </div>
              <Button type="button">Prévisualiser l&apos;envoi</Button>
            </form>
          </CardContent>
        </Card>
        <Alert>
          <AlertTitle>Disponibilité</AlertTitle>
          <AlertDescription>
            Les liens sociaux et WhatsApp viennent d&apos;une configuration temporaire typée.
          </AlertDescription>
        </Alert>
      </div>
    </PageContainer>
  );
}
