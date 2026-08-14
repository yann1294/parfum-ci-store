"use client";

import { CircleAlert } from "lucide-react";

import { PageContainer } from "@/components/shared/page-container";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboardError({ reset }: { reset: () => void }) {
  return (
    <PageContainer>
      <Card className="border-destructive/40">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <CircleAlert className="mt-1 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <h1 className="text-xl font-semibold">Tableau de bord indisponible</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Les indicateurs n’ont pas pu être chargés. Aucun détail technique sensible n’est
                affiché.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={reset}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
