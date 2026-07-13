import { EmptyState } from "@/components/shared/empty-state";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminPage() {
  return (
    <PageContainer>
      <SectionHeading
        eyebrow="Administration"
        title="Tableau de bord"
        description="Shell temporaire pour valider la navigation, les surfaces et les états d'interface."
      />
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {["Commandes", "Paiements", "Stock"].map((label) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="text-xl">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">0</p>
              <p className="text-sm text-muted-foreground">Données à connecter</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Événement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Installation du design system</TableCell>
                <TableCell>
                  <Badge>Prêt</Badge>
                </TableCell>
                <TableCell>Aujourd&apos;hui</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="mt-8">
        <EmptyState
          title="Aucune opération métier"
          description="Les modules Supabase, inventaire et commandes ne sont pas encore implémentés."
        />
      </div>
    </PageContainer>
  );
}
