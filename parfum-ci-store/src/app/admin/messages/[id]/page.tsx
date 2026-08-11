import Link from "next/link";

import { MessageDetailView } from "@/components/admin/messages/message-detail";
import { buttonVariants } from "@/components/ui/button";
import { getMessageDetailOrNotFound } from "@/lib/messages/admin";

export default async function AdminMessageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const message = await getMessageDetailOrNotFound(id);
  const returnPath = query.retour?.startsWith("/admin/messages") ? query.retour : "/admin/messages";

  return (
    <div className="grid gap-6">
      <div>
        <Link href={returnPath} className={buttonVariants({ variant: "outline" })}>
          Retour aux messages
        </Link>
      </div>
      <MessageDetailView message={message} />
    </div>
  );
}
