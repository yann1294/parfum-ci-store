import { Badge } from "@/components/ui/badge";
import { messageSourceLabel, messageStatusLabel } from "@/lib/messages/admin";

export function MessageStatusBadge({ status }: { status: string }) {
  const variant = status === "SPAM" ? "destructive" : status === "NEW" ? "default" : "secondary";
  return <Badge variant={variant}>{messageStatusLabel(status)}</Badge>;
}

export function MessageSourceBadge({ source }: { source: string }) {
  return <Badge variant="outline">{messageSourceLabel(source)}</Badge>;
}
