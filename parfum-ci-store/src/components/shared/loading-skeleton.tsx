import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ label = "Chargement" }: { label?: string }) {
  return (
    <div className="space-y-3" role="status" aria-label={label}>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
