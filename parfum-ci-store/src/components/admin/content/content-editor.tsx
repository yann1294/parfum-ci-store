"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  updateContentSection,
  type ContentActionState,
} from "@/app/admin/contenu/actions";
import type {
  StoreContentPageKey,
  StorefrontContent,
} from "@/lib/storefront/content-schemas";

const sections: Array<{ key: StoreContentPageKey; label: string }> = [
  { key: "home", label: "Accueil" },
  { key: "about", label: "À propos" },
  { key: "contact", label: "Contact" },
  { key: "delivery", label: "Livraison et paiement" },
  { key: "social", label: "Réseaux sociaux" },
];

const initialState: ContentActionState = { ok: false, message: "" };

function rowsToText(rows: Array<Record<string, string>>, columns: string[]) {
  return rows.map((row) => columns.map((column) => row[column] ?? "").join(" | ")).join("\n");
}

function Field({
  name,
  label,
  defaultValue,
  multiline = false,
  help,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  multiline?: boolean;
  help?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <Textarea name={name} defaultValue={defaultValue} rows={4} />
      ) : (
        <Input name={name} defaultValue={defaultValue} />
      )}
      {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

export function ContentEditor({ content }: { content: StorefrontContent }) {
  const [active, setActive] = useState<StoreContentPageKey>("home");
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState(updateContentSection, initialState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      queueMicrotask(() => setDirty(false));
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const lastUpdated = content.updatedAt[active];
  const form = useMemo(() => {
    if (active === "home") {
      const value = content.home;
      return (
        <>
          <Field name="heroTitle" label="Titre principal" defaultValue={value.heroTitle} />
          <Field name="heroSubtitle" label="Sous-titre" defaultValue={value.heroSubtitle} multiline />
          <Field name="primaryCtaLabel" label="Libellé CTA principal" defaultValue={value.primaryCtaLabel} />
          <Field name="secondaryCtaLabel" label="Libellé CTA secondaire" defaultValue={value.secondaryCtaLabel} />
          <Field
            name="trustPoints"
            label="Points de confiance"
            defaultValue={rowsToText(value.trustPoints, ["title", "description"])}
            multiline
            help="Une ligne par élément: Titre | Description. Maximum 6."
          />
          <Field
            name="orderingSteps"
            label="Étapes de commande"
            defaultValue={rowsToText(value.orderingSteps, ["title", "description"])}
            multiline
            help="Une ligne par étape: Titre | Description. Maximum 6."
          />
          <Field name="deliveryTeaser" label="Accroche livraison" defaultValue={value.deliveryTeaser} multiline />
          <Field name="socialCtaCopy" label="Accroche réseaux sociaux" defaultValue={value.socialCtaCopy} multiline />
          <Field name="seoTitle" label="Titre SEO" defaultValue={value.seoTitle} />
          <Field name="seoDescription" label="Description SEO" defaultValue={value.seoDescription} multiline />
        </>
      );
    }

    if (active === "about") {
      const value = content.about;
      return (
        <>
          <Field name="pageTitle" label="Titre de page" defaultValue={value.pageTitle} />
          <Field name="introText" label="Introduction" defaultValue={value.introText} multiline />
          <Field name="brandStory" label="Histoire de marque" defaultValue={value.brandStory} multiline />
          <Field name="mission" label="Mission" defaultValue={value.mission} multiline />
          <Field name="values" label="Valeurs" defaultValue={value.values.join("\n")} multiline help="Une valeur par ligne. Maximum 8." />
          <Field name="imageUrl" label="Image configurée" defaultValue={value.imageUrl} />
          <Field name="seoTitle" label="Titre SEO" defaultValue={value.seoTitle} />
          <Field name="seoDescription" label="Description SEO" defaultValue={value.seoDescription} multiline />
        </>
      );
    }

    if (active === "contact") {
      const value = content.contact;
      return (
        <>
          <Field name="pageTitle" label="Titre de page" defaultValue={value.pageTitle} />
          <Field name="introText" label="Introduction" defaultValue={value.introText} multiline />
          <Field name="telephone" label="Téléphone" defaultValue={value.telephone} />
          <Field name="whatsappNumber" label="Numéro WhatsApp" defaultValue={value.whatsappNumber} />
          <Field name="email" label="E-mail" defaultValue={value.email} />
          <Field name="address" label="Adresse" defaultValue={value.address} multiline />
          <Field
            name="openingHours"
            label="Horaires"
            defaultValue={rowsToText(value.openingHours, ["label", "value"])}
            multiline
            help="Une ligne par horaire: Libellé | Valeur. Maximum 14."
          />
          <Field name="mapUrl" label="Lien carte" defaultValue={value.mapUrl} />
          <Field name="whatsappCtaLabel" label="Libellé WhatsApp" defaultValue={value.whatsappCtaLabel} />
          <Field name="emailCtaLabel" label="Libellé e-mail" defaultValue={value.emailCtaLabel} />
          <Field name="phoneCtaLabel" label="Libellé appel" defaultValue={value.phoneCtaLabel} />
          <Field name="seoTitle" label="Titre SEO" defaultValue={value.seoTitle} />
          <Field name="seoDescription" label="Description SEO" defaultValue={value.seoDescription} multiline />
        </>
      );
    }

    if (active === "delivery") {
      const value = content.delivery;
      return (
        <>
          <Field name="pageTitle" label="Titre de page" defaultValue={value.pageTitle} />
          <Field name="introText" label="Introduction" defaultValue={value.introText} multiline />
          <Field
            name="zones"
            label="Zones de livraison"
            defaultValue={rowsToText(value.zones, ["name", "fee", "timeframe", "description"])}
            multiline
            help="Une ligne par zone: Nom | Frais | Délai | Description. Maximum 12."
          />
          <Field name="freeDeliveryConditions" label="Conditions de livraison offerte" defaultValue={value.freeDeliveryConditions} multiline />
          <Field name="pickupInformation" label="Retrait boutique" defaultValue={value.pickupInformation} multiline />
          <Field name="mobileMoneyDescription" label="Mobile Money" defaultValue={value.mobileMoneyDescription} multiline />
          <Field name="cashOnDeliveryConditions" label="Paiement à la livraison" defaultValue={value.cashOnDeliveryConditions} multiline />
          <Field name="orderConfirmationProcess" label="Confirmation de commande" defaultValue={value.orderConfirmationProcess} multiline />
          <Field name="faq" label="FAQ" defaultValue={rowsToText(value.faq, ["question", "answer"])} multiline help="Une ligne par question: Question | Réponse. Maximum 12." />
          <Field name="seoTitle" label="Titre SEO" defaultValue={value.seoTitle} />
          <Field name="seoDescription" label="Description SEO" defaultValue={value.seoDescription} multiline />
        </>
      );
    }

    const value = content.social;
    return (
      <>
        <Field name="instagramUrl" label="Instagram" defaultValue={value.instagramUrl} />
        <Field name="facebookUrl" label="Facebook" defaultValue={value.facebookUrl} />
        <Field name="tiktokUrl" label="TikTok" defaultValue={value.tiktokUrl} />
        <Field name="whatsappNumber" label="WhatsApp" defaultValue={value.whatsappNumber} />
        <Field name="socialCtaCopy" label="Accroche sociale" defaultValue={value.socialCtaCopy} multiline />
      </>
    );
  }, [active, content]);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <nav className="grid h-fit gap-2 rounded-lg border bg-surface p-2" aria-label="Sections de contenu">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => setActive(section.key)}
            className="rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-surface-muted"
            data-active={active === section.key}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <section className="rounded-lg border bg-surface p-5">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl">{sections.find((section) => section.key === active)?.label}</h2>
            {lastUpdated ? <p className="text-sm text-muted-foreground">Dernière mise à jour: {new Date(lastUpdated).toLocaleString("fr-FR")}</p> : null}
          </div>
          {dirty ? <span className="text-sm text-muted-foreground">Modifications non enregistrées</span> : null}
        </div>
        <Alert className="mb-5">
          <AlertTitle>Contenu structuré</AlertTitle>
          <AlertDescription>
            Les champs acceptent du texte simple. Les scripts, balises HTML et intégrations arbitraires ne sont pas utilisés.
          </AlertDescription>
        </Alert>
        <form key={active} action={formAction} onChange={() => setDirty(true)} className="grid gap-4">
          <input type="hidden" name="pageKey" value={active} />
          {form}
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
