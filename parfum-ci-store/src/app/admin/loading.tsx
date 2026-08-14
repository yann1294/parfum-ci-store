import { PageContainer } from "@/components/shared/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <PageContainer aria-label="Chargement du tableau de bord" aria-busy="true">
      <div className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-12 w-full max-w-lg" />
        <Skeleton className="h-6 w-full max-w-2xl" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-36 rounded-xl" />
        ))}
      </div>
      <div className="mt-6 grid gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <span className="sr-only">Chargement des indicateurs…</span>
    </PageContainer>
  );
}
