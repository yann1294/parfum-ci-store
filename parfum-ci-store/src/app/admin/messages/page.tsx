import { MessageFiltersForm, MessageList } from "@/components/admin/messages/message-list";
import { ManualMessageDialog } from "@/components/admin/messages/message-actions";
import { PageContainer } from "@/components/shared/page-container";
import { SectionHeading } from "@/components/shared/section-heading";
import { listMessages, normalizeMessageFilters, requireMessageAccess } from "@/lib/messages/admin";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const staff = await requireMessageAccess();
  const filters = normalizeMessageFilters(params);
  const result = await listMessages(params, staff);

  return (
    <PageContainer>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading
          eyebrow="Support"
          title="Messages"
          description="Traitez les demandes du site et les conversations reçues manuellement sans mélanger notes internes et contenu client."
        />
        <ManualMessageDialog />
      </div>
      <div className="mt-8 grid gap-6">
        <MessageFiltersForm searchParams={params} />
        <MessageList result={result} filters={filters} searchParams={params} />
      </div>
    </PageContainer>
  );
}
