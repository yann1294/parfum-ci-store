"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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

type ContentDraft = Record<string, string>;

function rowsToText(rows: Array<Record<string, string>>, columns: string[]) {
  return rows.map((row) => columns.map((column) => row[column] ?? "").join(" | ")).join("\n");
}

function draftFromContent(content: StorefrontContent, pageKey: StoreContentPageKey): ContentDraft {
  if (pageKey === "home") {
    const value = content.home;
    return {
      heroTitle: value.heroTitle,
      heroSubtitle: value.heroSubtitle,
      primaryCtaLabel: value.primaryCtaLabel,
      secondaryCtaLabel: value.secondaryCtaLabel,
      trustPoints: rowsToText(value.trustPoints, ["title", "description"]),
      orderingSteps: rowsToText(value.orderingSteps, ["title", "description"]),
      deliveryTeaser: value.deliveryTeaser,
      socialCtaCopy: value.socialCtaCopy,
      seoTitle: value.seoTitle,
      seoDescription: value.seoDescription,
    };
  }

  if (pageKey === "about") {
    const value = content.about;
    return {
      pageTitle: value.pageTitle,
      introText: value.introText,
      brandStory: value.brandStory,
      mission: value.mission,
      values: value.values.join("\n"),
      imageUrl: value.imageUrl,
      seoTitle: value.seoTitle,
      seoDescription: value.seoDescription,
    };
  }

  if (pageKey === "contact") {
    const value = content.contact;
    return {
      pageTitle: value.pageTitle,
      introText: value.introText,
      telephone: value.telephone,
      whatsappNumber: value.whatsappNumber,
      email: value.email,
      address: value.address,
      openingHours: rowsToText(value.openingHours, ["label", "value"]),
      mapUrl: value.mapUrl,
      whatsappCtaLabel: value.whatsappCtaLabel,
      emailCtaLabel: value.emailCtaLabel,
      phoneCtaLabel: value.phoneCtaLabel,
      seoTitle: value.seoTitle,
      seoDescription: value.seoDescription,
    };
  }

  if (pageKey === "delivery") {
    const value = content.delivery;
    return {
      pageTitle: value.pageTitle,
      introText: value.introText,
      zones: rowsToText(value.zones, ["name", "fee", "timeframe", "description"]),
      freeDeliveryConditions: value.freeDeliveryConditions,
      pickupInformation: value.pickupInformation,
      mobileMoneyDescription: value.mobileMoneyDescription,
      cashOnDeliveryConditions: value.cashOnDeliveryConditions,
      orderConfirmationProcess: value.orderConfirmationProcess,
      faq: rowsToText(value.faq, ["question", "answer"]),
      seoTitle: value.seoTitle,
      seoDescription: value.seoDescription,
    };
  }

  const value = content.social;
  return {
    instagramUrl: value.instagramUrl,
    facebookUrl: value.facebookUrl,
    tiktokUrl: value.tiktokUrl,
    whatsappNumber: value.whatsappNumber,
    socialCtaCopy: value.socialCtaCopy,
  };
}

function contentWithSavedSection(
  content: StorefrontContent,
  pageKey: StoreContentPageKey,
  value: NonNullable<ContentActionState["value"]>,
): StorefrontContent {
  return {
    ...content,
    [pageKey]: value,
  };
}

function Field({
  name,
  label,
  value,
  onChange,
  multiline = false,
  help,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean;
  help?: string;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(name, event.target.value);
  };

  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <Textarea name={name} value={value} onChange={handleChange} rows={4} />
      ) : (
        <Input name={name} value={value} onChange={handleChange} />
      )}
      {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

export function ContentEditor({ content }: { content: StorefrontContent }) {
  const [active, setActive] = useState<StoreContentPageKey>("home");
  const [draft, setDraft] = useState<ContentDraft>(() => draftFromContent(content, "home"));
  const [dirty, setDirty] = useState(false);
  const [state, formAction] = useActionState(updateContentSection, initialState);
  const hasMounted = useRef(false);
  const handledActionState = useRef<ContentActionState | null>(null);

  const updateDraft = (name: string, value: string) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setDirty(true);
  };

  const selectSection = (pageKey: StoreContentPageKey) => {
    setActive(pageKey);
    setDraft(draftFromContent(content, pageKey));
    setDirty(false);
  };

  useEffect(() => {
    if (!state.message) return;
    if (handledActionState.current === state) return;
    handledActionState.current = state;
    if (state.ok) {
      const savedPageKey = state.pageKey;
      const savedValue = state.value;
      if (savedPageKey && savedValue && savedPageKey === active) {
        queueMicrotask(() => {
          setDraft(draftFromContent(contentWithSavedSection(content, savedPageKey, savedValue), savedPageKey));
        });
      }
      queueMicrotask(() => setDirty(false));
      toast.success(state.message);
    } else {
      toast.error(state.message);
    }
  }, [active, content, state]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (dirty) return;
    queueMicrotask(() => setDraft(draftFromContent(content, active)));
  }, [active, content, dirty]);

  const lastUpdated = content.updatedAt[active];
  const fieldValue = (name: string) => draft[name] ?? "";

  const renderForm = () => {
    if (active === "home") {
      return (
        <>
          <Field name="heroTitle" label="Titre principal" value={fieldValue("heroTitle")} onChange={updateDraft} />
          <Field name="heroSubtitle" label="Sous-titre" value={fieldValue("heroSubtitle")} onChange={updateDraft} multiline />
          <Field name="primaryCtaLabel" label="Libellé CTA principal" value={fieldValue("primaryCtaLabel")} onChange={updateDraft} />
          <Field name="secondaryCtaLabel" label="Libellé CTA secondaire" value={fieldValue("secondaryCtaLabel")} onChange={updateDraft} />
          <Field
            name="trustPoints"
            label="Points de confiance"
            value={fieldValue("trustPoints")}
            onChange={updateDraft}
            multiline
            help="Une ligne par élément: Titre | Description. Maximum 6."
          />
          <Field
            name="orderingSteps"
            label="Étapes de commande"
            value={fieldValue("orderingSteps")}
            onChange={updateDraft}
            multiline
            help="Une ligne par étape: Titre | Description. Maximum 6."
          />
          <Field name="deliveryTeaser" label="Accroche livraison" value={fieldValue("deliveryTeaser")} onChange={updateDraft} multiline />
          <Field name="socialCtaCopy" label="Accroche réseaux sociaux" value={fieldValue("socialCtaCopy")} onChange={updateDraft} multiline />
          <Field name="seoTitle" label="Titre SEO" value={fieldValue("seoTitle")} onChange={updateDraft} />
          <Field name="seoDescription" label="Description SEO" value={fieldValue("seoDescription")} onChange={updateDraft} multiline />
        </>
      );
    }

    if (active === "about") {
      return (
        <>
          <Field name="pageTitle" label="Titre de page" value={fieldValue("pageTitle")} onChange={updateDraft} />
          <Field name="introText" label="Introduction" value={fieldValue("introText")} onChange={updateDraft} multiline />
          <Field name="brandStory" label="Histoire de marque" value={fieldValue("brandStory")} onChange={updateDraft} multiline />
          <Field name="mission" label="Mission" value={fieldValue("mission")} onChange={updateDraft} multiline />
          <Field name="values" label="Valeurs" value={fieldValue("values")} onChange={updateDraft} multiline help="Une valeur par ligne. Maximum 8." />
          <Field name="imageUrl" label="Image configurée" value={fieldValue("imageUrl")} onChange={updateDraft} />
          <Field name="seoTitle" label="Titre SEO" value={fieldValue("seoTitle")} onChange={updateDraft} />
          <Field name="seoDescription" label="Description SEO" value={fieldValue("seoDescription")} onChange={updateDraft} multiline />
        </>
      );
    }

    if (active === "contact") {
      return (
        <>
          <Field name="pageTitle" label="Titre de page" value={fieldValue("pageTitle")} onChange={updateDraft} />
          <Field name="introText" label="Introduction" value={fieldValue("introText")} onChange={updateDraft} multiline />
          <Field name="telephone" label="Téléphone" value={fieldValue("telephone")} onChange={updateDraft} />
          <Field name="whatsappNumber" label="Numéro WhatsApp" value={fieldValue("whatsappNumber")} onChange={updateDraft} />
          <Field name="email" label="E-mail" value={fieldValue("email")} onChange={updateDraft} />
          <Field name="address" label="Adresse" value={fieldValue("address")} onChange={updateDraft} multiline />
          <Field
            name="openingHours"
            label="Horaires"
            value={fieldValue("openingHours")}
            onChange={updateDraft}
            multiline
            help="Une ligne par horaire: Libellé | Valeur. Maximum 14."
          />
          <Field name="mapUrl" label="Lien carte" value={fieldValue("mapUrl")} onChange={updateDraft} />
          <Field name="whatsappCtaLabel" label="Libellé WhatsApp" value={fieldValue("whatsappCtaLabel")} onChange={updateDraft} />
          <Field name="emailCtaLabel" label="Libellé e-mail" value={fieldValue("emailCtaLabel")} onChange={updateDraft} />
          <Field name="phoneCtaLabel" label="Libellé appel" value={fieldValue("phoneCtaLabel")} onChange={updateDraft} />
          <Field name="seoTitle" label="Titre SEO" value={fieldValue("seoTitle")} onChange={updateDraft} />
          <Field name="seoDescription" label="Description SEO" value={fieldValue("seoDescription")} onChange={updateDraft} multiline />
        </>
      );
    }

    if (active === "delivery") {
      return (
        <>
          <Field name="pageTitle" label="Titre de page" value={fieldValue("pageTitle")} onChange={updateDraft} />
          <Field name="introText" label="Introduction" value={fieldValue("introText")} onChange={updateDraft} multiline />
          <Field
            name="zones"
            label="Zones de livraison"
            value={fieldValue("zones")}
            onChange={updateDraft}
            multiline
            help="Une ligne par zone: Nom | Frais | Délai | Description. Maximum 12."
          />
          <Field name="freeDeliveryConditions" label="Conditions de livraison offerte" value={fieldValue("freeDeliveryConditions")} onChange={updateDraft} multiline />
          <Field name="pickupInformation" label="Retrait boutique" value={fieldValue("pickupInformation")} onChange={updateDraft} multiline />
          <Field name="mobileMoneyDescription" label="Mobile Money" value={fieldValue("mobileMoneyDescription")} onChange={updateDraft} multiline />
          <Field name="cashOnDeliveryConditions" label="Paiement à la livraison" value={fieldValue("cashOnDeliveryConditions")} onChange={updateDraft} multiline />
          <Field name="orderConfirmationProcess" label="Confirmation de commande" value={fieldValue("orderConfirmationProcess")} onChange={updateDraft} multiline />
          <Field name="faq" label="FAQ" value={fieldValue("faq")} onChange={updateDraft} multiline help="Une ligne par question: Question | Réponse. Maximum 12." />
          <Field name="seoTitle" label="Titre SEO" value={fieldValue("seoTitle")} onChange={updateDraft} />
          <Field name="seoDescription" label="Description SEO" value={fieldValue("seoDescription")} onChange={updateDraft} multiline />
        </>
      );
    }

    return (
      <>
        <Field name="instagramUrl" label="Instagram" value={fieldValue("instagramUrl")} onChange={updateDraft} />
        <Field name="facebookUrl" label="Facebook" value={fieldValue("facebookUrl")} onChange={updateDraft} />
        <Field name="tiktokUrl" label="TikTok" value={fieldValue("tiktokUrl")} onChange={updateDraft} />
        <Field name="whatsappNumber" label="WhatsApp" value={fieldValue("whatsappNumber")} onChange={updateDraft} />
        <Field name="socialCtaCopy" label="Accroche sociale" value={fieldValue("socialCtaCopy")} onChange={updateDraft} multiline />
      </>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <nav className="grid h-fit gap-2 rounded-lg border bg-surface p-2" aria-label="Sections de contenu">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => selectSection(section.key)}
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
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="pageKey" value={active} />
          {renderForm()}
          <div className="flex justify-end">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
