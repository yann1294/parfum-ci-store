import { AssignToSelfButton, NoteForm, StatusActionButtons } from "@/components/admin/messages/message-actions";
import { MessageSourceBadge, MessageStatusBadge } from "@/components/admin/messages/message-status";
import { buttonVariants } from "@/components/ui/button";
import { getRoleLabel } from "@/lib/auth/permissions";
import { requireActiveStaff } from "@/lib/auth/server";
import { messageStatusLabel, type MessageDetail } from "@/lib/messages/admin";

function whatsappHref(number: string | null, orderNumber?: string | null) {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (!digits) return null;
  const text = encodeURIComponent(`Bonjour, nous vous contactons au sujet de votre message envoyé à PerfumeCI${orderNumber ? ` pour la commande ${orderNumber}` : ""}.`);
  return `https://wa.me/${digits}?text=${text}`;
}

function mailHref(email: string | null, subject: string) {
  if (!email) return null;
  return `mailto:${email}?subject=${encodeURIComponent(`Réponse PerfumeCI - ${subject.slice(0, 80)}`)}`;
}

export async function MessageDetailView({ message }: { message: MessageDetail }) {
  const staff = await requireActiveStaff();
  const wa = whatsappHref(message.whatsapp ?? message.phone, message.orderNumber);
  const mail = mailHref(message.email, message.subject);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
      <main className="grid gap-6">
        <section className="rounded-lg border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{new Date(message.createdAt).toLocaleString("fr-FR")}</p>
              <h1 className="font-heading text-4xl">{message.subject}</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <MessageSourceBadge source={message.source} />
              <MessageStatusBadge status={message.status} />
            </div>
          </div>
          <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <Info label="Client" value={message.customerName} />
            <Info label="Téléphone" value={message.phone ?? "-"} />
            <Info label="WhatsApp" value={message.whatsapp ?? "-"} />
            <Info label="E-mail" value={message.email ?? "-"} />
            <Info label="Préférence" value={message.preferredContactMethod ?? "-"} />
            <Info label="Assigné" value={message.assignedName ?? "Non assigné"} />
            <Info label="Commande" value={message.orderNumber ?? "-"} />
            <Info label="Produit" value={message.productName ?? "-"} />
            <Info label="Source page" value={message.sourcePage ?? "-"} />
            <Info label="Référence source" value={message.sourceReference ?? message.externalHandle ?? "-"} />
          </dl>
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="font-heading text-3xl">Message client</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{message.body}</p>
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="font-heading text-3xl">Historique</h2>
          <div className="mt-4 grid gap-3">
            {message.statusHistory.map((entry) => (
              <article key={entry.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{entry.fromStatus ? `${messageStatusLabel(entry.fromStatus)} → ` : ""}{messageStatusLabel(entry.toStatus)}</p>
                <p className="text-muted-foreground">{new Date(entry.createdAt).toLocaleString("fr-FR")} · {entry.actorName ?? "Système"}</p>
                {entry.reason ? <p>{entry.reason}</p> : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border bg-surface p-5">
          <h2 className="font-heading text-3xl">Notes internes</h2>
          <div className="mt-4 grid gap-3">
            {message.notes.length === 0 ? <p className="text-sm text-muted-foreground">Aucune note interne.</p> : null}
            {message.notes.map((note) => (
              <article key={note.id} className="rounded-md border p-3 text-sm">
                <p className="whitespace-pre-wrap">{note.note}</p>
                <p className="mt-2 text-muted-foreground">{new Date(note.createdAt).toLocaleString("fr-FR")} · {note.actorName ?? "Staff"}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <aside className="grid content-start gap-4">
        <section className="rounded-lg border bg-surface p-4">
          <h2 className="font-heading text-2xl">Actions</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <AssignToSelfButton messageId={message.id} staffId={staff.id} />
            {message.phone ? <a href={`tel:${message.phone}`} className={buttonVariants({ variant: "outline" })}>Appeler</a> : null}
            {wa ? <a href={wa} className={buttonVariants({ variant: "outline" })} target="_blank" rel="noreferrer">Répondre WhatsApp</a> : null}
            {mail ? <a href={mail} className={buttonVariants({ variant: "outline" })}>Répondre e-mail</a> : null}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Ouvrir un lien de réponse ne change pas le statut du message.</p>
        </section>
        <StatusActionButtons messageId={message.id} currentStatus={message.status} />
        <NoteForm messageId={message.id} />
        <section className="rounded-lg border bg-surface p-4 text-sm">
          <h2 className="font-heading text-2xl">Attribution</h2>
          <dl className="mt-3 grid gap-2">
            {Object.entries(message.attribution).map(([key, value]) => <Info key={key} label={key} value={value ?? "-"} />)}
          </dl>
          <p className="mt-3 text-muted-foreground">Connecté en tant que {getRoleLabel(staff.role)}.</p>
        </section>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  );
}
