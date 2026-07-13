import { notFound } from "next/navigation";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const tokens = [
  "background",
  "surface",
  "surface-muted",
  "foreground",
  "muted-foreground",
  "border",
  "primary",
  "secondary",
  "accent",
  "destructive",
  "success",
  "warning",
];

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Développement"
        title="Design system"
        description="Page temporaire pour contrôler les tokens, composants et états avant les pages métier."
      />

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {tokens.map((token) => (
          <Card key={token}>
            <CardHeader>
              <div
                className="h-16 rounded-md border"
                style={{ backgroundColor: `var(--${token})` }}
              />
              <CardTitle className="text-xl">--{token}</CardTitle>
              <CardDescription>Token sémantique CSS</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Separator className="my-10" />

      <Tabs defaultValue="components">
        <TabsList>
          <TabsTrigger value="components">Composants</TabsTrigger>
          <TabsTrigger value="forms">Champs</TabsTrigger>
          <TabsTrigger value="states">États</TabsTrigger>
        </TabsList>
        <TabsContent value="components" className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Typographie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <h1 className="text-5xl font-semibold">Titre Cormorant Garamond</h1>
              <p className="max-w-2xl text-muted-foreground">
                Texte courant Manrope pour les paragraphes, contrôles et surfaces opérationnelles.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Boutons et badges</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Principal</Button>
              <Button variant="secondary">Secondaire</Button>
              <Button variant="outline">Contour</Button>
              <Button variant="ghost">Discret</Button>
              <Button variant="destructive">Destructif</Button>
              <Badge>Publié</Badge>
              <Badge variant="secondary">Brouillon</Badge>
              <Badge variant="outline">À vérifier</Badge>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="forms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Formulaire</CardTitle>
            </CardHeader>
            <CardContent className="grid max-w-xl gap-5">
              <div className="grid gap-2">
                <Label htmlFor="ds-name">Nom</Label>
                <Input id="ds-name" placeholder="Nom du parfum" />
              </div>
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select defaultValue="published">
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ds-description">Description</Label>
                <Textarea id="ds-description" placeholder="Notes olfactives..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="states" className="mt-6 grid gap-6">
          <Alert>
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>Message système avec contraste AA.</AlertDescription>
          </Alert>
          <ErrorState
            title="État d'erreur"
            description="Message utile et action de récupération."
          />
          <LoadingSkeleton label="Chargement des composants" />
          <Card>
            <CardHeader>
              <CardTitle>Table</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Badge>Actif</Badge>
                    </TableCell>
                    <TableCell>Catalogue visible</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
