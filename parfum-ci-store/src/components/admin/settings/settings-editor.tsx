"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  previewDeliveryQuote,
  saveSettingsSection,
  type DeliveryPreviewState,
  type SettingsActionState,
} from "@/app/admin/parametres/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatXof } from "@/lib/catalogue/format";
import {
  defaultPaymentConfigs,
  supportedPaymentMethods,
  validatePaymentSettingsForSave,
} from "@/lib/orders/payment-settings-core";
import {
  deliveryMethodLabels,
  paymentMethodLabel,
  type DeliveryMethod,
  type PaymentMethod,
} from "@/lib/orders/display";
import type { AdminStoreSettings } from "@/lib/settings/service";
import {
  sectionSchemas,
  type DeliverySettings,
  type SettingsSection,
  type SettingsSectionValues,
} from "@/lib/settings/schemas";

const sections: Array<{ key: SettingsSection; label: string }> = [
  { key: "identity", label: "Identité" },
  { key: "contact", label: "Contact" },
  { key: "social", label: "Réseaux sociaux" },
  { key: "payments", label: "Paiements" },
  { key: "delivery", label: "Livraison" },
  { key: "seo", label: "Référencement" },
  { key: "notifications", label: "Notifications" },
  { key: "availability", label: "Disponibilité de la boutique" },
];

const saveInitial: SettingsActionState = { ok: false, message: "" };
const previewInitial: DeliveryPreviewState = { ok: false, message: "" };

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function nullableNumber(value: string) {
  return value === "" ? null : Number(value);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
  help,
  required = false,
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  help?: string;
  required?: boolean;
  min?: number;
  max?: number;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          rows={4}
          required={required}
        />
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          required={required}
          min={min}
          max={max}
        />
      )}
      {help ? <span className="text-xs text-muted-foreground">{help}</span> : null}
    </label>
  );
}

export function SettingsEditor({ initialSettings }: { initialSettings: AdminStoreSettings }) {
  const [active, setActive] = useState<SettingsSection>("identity");
  const [settings, setSettings] = useState(() => clone(initialSettings));
  const [draft, setDraft] = useState<SettingsSectionValues[SettingsSection]>(() =>
    clone(initialSettings.identity),
  );
  const [dirty, setDirty] = useState(false);
  const handledState = useRef<SettingsActionState | null>(null);
  const [state, formAction, pending] = useActionState(saveSettingsSection, saveInitial);

  function setValue<K extends SettingsSection>(section: K, value: SettingsSectionValues[K]) {
    if (section !== active) return;
    setDraft(value as SettingsSectionValues[SettingsSection]);
    setDirty(true);
  }

  function selectSection(section: SettingsSection) {
    if (
      dirty &&
      !window.confirm("Abandonner les modifications non enregistrées de cette section ?")
    )
      return;
    setActive(section);
    setDraft(clone(settings[section]));
    setDirty(false);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (!state.message || handledState.current === state) return;
    handledState.current = state;
    if (state.ok && state.section && state.revision && state.value) {
      const section = state.section;
      queueMicrotask(() => {
        setSettings((current) => ({
          ...current,
          [section]: clone(state.value),
          revision: state.revision!,
          updatedAt: state.updatedAt ?? current.updatedAt,
        }));
        setDraft(clone(state.value) as SettingsSectionValues[SettingsSection]);
        setDirty(false);
      });
      toast.success(state.message);
    } else toast.error(state.message);
  }, [state]);

  const payload = useMemo(
    () =>
      JSON.stringify({
        section: active,
        expectedRevision: settings.revision,
        mutationId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : "00000000-0000-4000-8000-000000000001",
        value: draft,
      }),
    [active, draft, settings.revision],
  );
  const draftValid = useMemo(
    () => sectionSchemas[active].safeParse(draft).success,
    [active, draft],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[16rem_minmax(0,1fr)]">
      <nav
        className="grid h-fit gap-1 rounded-lg border bg-surface p-2"
        aria-label="Sections des paramètres"
      >
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            onClick={() => selectSection(section.key)}
            className="rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-surface-muted focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-surface-muted"
            data-active={section.key === active}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <form action={formAction} className="min-w-0 rounded-lg border bg-surface p-4 sm:p-6">
        <input type="hidden" name="payload" value={payload} />
        <div className="mb-6">
          <h2 className="font-heading text-3xl">
            {sections.find((item) => item.key === active)?.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Révision {settings.revision} · aperçu local avant enregistrement.
          </p>
        </div>
        {state.conflict ? (
          <Alert className="mb-5">
            <AlertTitle>Version obsolète</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {!state.ok && state.message && !state.conflict ? (
          <Alert className="mb-5" variant="destructive">
            <AlertTitle>Enregistrement impossible</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {renderSection(active, draft, setValue)}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <p className="text-xs text-muted-foreground" role="status">
            {dirty ? "Modifications non enregistrées" : "Section à jour"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || pending}
              onClick={() => {
                setDraft(clone(settings[active]));
                setDirty(false);
              }}
            >
              Réinitialiser
            </Button>
            <Button type="submit" disabled={!dirty || pending || state.conflict || !draftValid}>
              {pending ? "Enregistrement..." : "Enregistrer la section"}
            </Button>
          </div>
        </div>
        {dirty && !draftValid ? (
          <p className="mt-2 text-right text-xs text-destructive">
            Corrigez les champs invalides avant l&apos;enregistrement.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function renderSection<K extends SettingsSection>(
  section: K,
  raw: SettingsSectionValues[SettingsSection],
  update: (section: K, value: SettingsSectionValues[K]) => void,
) {
  if (section === "identity") {
    const value = raw as SettingsSectionValues["identity"];
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Nom de la boutique"
            value={value.storeName}
            required
            onChange={(storeName) =>
              update(section, { ...value, storeName } as SettingsSectionValues[K])
            }
          />
          <Field
            label="Raison sociale / nom légal"
            value={value.legalName}
            onChange={(legalName) =>
              update(section, { ...value, legalName } as SettingsSectionValues[K])
            }
          />
        </div>
        <Field
          label="Logo (URL HTTPS)"
          value={value.logoUrl}
          type="url"
          help="Politique MVP: URL HTTPS uniquement. Le stockage de marque dédié sera préféré lorsqu'il sera disponible."
          onChange={(logoUrl) => update(section, { ...value, logoUrl } as SettingsSectionValues[K])}
        />
        <Field
          label="Adresse principale"
          value={value.primaryAddress}
          multiline
          onChange={(primaryAddress) =>
            update(section, { ...value, primaryAddress } as SettingsSectionValues[K])
          }
        />
        <Field
          label="Adresse secondaire"
          value={value.secondaryAddress}
          multiline
          onChange={(secondaryAddress) =>
            update(section, { ...value, secondaryAddress } as SettingsSectionValues[K])
          }
        />
        <Preview title="Aperçu identité">
          <p className="font-heading text-2xl">{value.storeName || "Nom de la boutique"}</p>
          <p className="text-sm text-muted-foreground">
            {value.primaryAddress || "Adresse non configurée"}
          </p>
        </Preview>
      </div>
    );
  }
  if (section === "contact") {
    const value = raw as SettingsSectionValues["contact"];
    const hoursText = value.businessHours.map((item) => `${item.label} | ${item.value}`).join("\n");
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="E-mail support"
            value={value.supportEmail}
            type="email"
            onChange={(supportEmail) =>
              update(section, { ...value, supportEmail } as SettingsSectionValues[K])
            }
          />
          <Field
            label="E-mail public distinct"
            value={value.contactEmail}
            type="email"
            onChange={(contactEmail) =>
              update(section, { ...value, contactEmail } as SettingsSectionValues[K])
            }
          />
          <Field
            label="Téléphone principal"
            value={value.contactPhone}
            type="tel"
            help="Normalisé en +225XXXXXXXXXX à l'enregistrement."
            onChange={(contactPhone) =>
              update(section, { ...value, contactPhone } as SettingsSectionValues[K])
            }
          />
          <Field
            label="WhatsApp"
            value={value.whatsappNumber}
            type="tel"
            onChange={(whatsappNumber) =>
              update(section, { ...value, whatsappNumber } as SettingsSectionValues[K])
            }
          />
        </div>
        <Field
          label="Horaires"
          value={hoursText}
          multiline
          help="Une ligne: Libellé | Valeur"
          onChange={(text) =>
            update(section, {
              ...value,
              businessHours: text
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => {
                  const [label, ...parts] = line.split("|");
                  return { label: label?.trim() ?? "", value: parts.join("|").trim() };
                }),
            } as SettingsSectionValues[K])
          }
        />
        <Field
          label="Délai de réponse indicatif"
          value={value.responseTimeGuidance}
          onChange={(responseTimeGuidance) =>
            update(section, { ...value, responseTimeGuidance } as SettingsSectionValues[K])
          }
        />
        <Preview title="Aperçu contact">
          <p>{value.contactPhone || "Téléphone non configuré"}</p>
          <p>{value.whatsappNumber || "WhatsApp non configuré"}</p>
          <p>{value.supportEmail || value.contactEmail || "E-mail non configuré"}</p>
        </Preview>
      </div>
    );
  }
  if (section === "social") {
    const value = raw as SettingsSectionValues["social"];
    return (
      <div className="grid gap-5">
        <Field
          label="Instagram (HTTPS)"
          value={value.instagramUrl}
          type="url"
          onChange={(instagramUrl) =>
            update(section, { ...value, instagramUrl } as SettingsSectionValues[K])
          }
        />
        <Field
          label="Facebook (HTTPS)"
          value={value.facebookUrl}
          type="url"
          onChange={(facebookUrl) =>
            update(section, { ...value, facebookUrl } as SettingsSectionValues[K])
          }
        />
        <Field
          label="TikTok (HTTPS)"
          value={value.tiktokUrl}
          type="url"
          onChange={(tiktokUrl) =>
            update(section, { ...value, tiktokUrl } as SettingsSectionValues[K])
          }
        />
        <Preview title="Aperçu réseaux">
          <div className="flex flex-wrap gap-2">
            {Object.entries(value)
              .filter(([, url]) => url)
              .map(([name]) => (
                <span className="rounded-md border px-3 py-1 text-sm" key={name}>
                  {name.replace("Url", "")}
                </span>
              ))}
          </div>
        </Preview>
      </div>
    );
  }
  if (section === "payments") {
    const value = raw as SettingsSectionValues["payments"];
    const configs = { ...defaultPaymentConfigs([]), ...value.paymentMethodConfigs };
    const paymentIssues = validatePaymentSettingsForSave(configs);
    const patch = (method: PaymentMethod, field: string, fieldValue: string | number | boolean) =>
      update(section, {
        paymentMethodConfigs: { ...configs, [method]: { ...configs[method], [field]: fieldValue } },
      } as SettingsSectionValues[K]);
    return (
      <div className="grid gap-4">
        <Alert>
          <AlertTitle>Configuration publique</AlertTitle>
          <AlertDescription>
            Ne saisissez jamais de PIN, OTP, CVV ni secret bancaire.
          </AlertDescription>
        </Alert>
        {supportedPaymentMethods.map((method) => (
          <fieldset key={method} className="grid min-w-0 gap-3 rounded-lg border p-4">
            <legend className="px-1 font-medium">{paymentMethodLabel(method)}</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={configs[method].enabled}
                onChange={(event) => patch(method, "enabled", event.currentTarget.checked)}
              />{" "}
              Activé
            </label>
            <div className="grid gap-3 md:grid-cols-[1fr_7rem]">
              <Field
                label="Libellé client"
                value={configs[method].label}
                required
                onChange={(v) => patch(method, "label", v)}
              />
              <Field
                label="Ordre"
                value={configs[method].displayOrder}
                type="number"
                min={0}
                max={100}
                onChange={(v) => patch(method, "displayOrder", Number(v))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Numéro marchand"
                value={configs[method].merchantNumber}
                onChange={(v) => patch(method, "merchantNumber", v)}
              />
              <Field
                label="Bénéficiaire"
                value={configs[method].beneficiaryName}
                onChange={(v) => patch(method, "beneficiaryName", v)}
              />
            </div>
            <Field
              label="Instructions publiques"
              value={configs[method].instructions}
              multiline
              onChange={(v) => patch(method, "instructions", v)}
            />
          </fieldset>
        ))}
        {paymentIssues.length > 0 ? (
          <Alert variant="destructive">
            <AlertTitle>Configuration incomplète</AlertTitle>
            <AlertDescription>{paymentIssues[0]?.message}</AlertDescription>
          </Alert>
        ) : null}
        <Preview title="Aperçu paiement">
          {supportedPaymentMethods
            .filter((method) => configs[method].enabled)
            .map((method) => (
              <div key={method} className="border-b py-2 last:border-0">
                <p className="font-medium">{configs[method].label}</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {configs[method].instructions || "Instructions non configurées"}
                </p>
              </div>
            ))}
        </Preview>
      </div>
    );
  }
  if (section === "delivery")
    return (
      <DeliverySection
        value={raw as DeliverySettings}
        onChange={(value) => update(section, value as SettingsSectionValues[K])}
      />
    );
  if (section === "seo") {
    const value = raw as SettingsSectionValues["seo"];
    return (
      <div className="grid gap-5">
        <Field
          label="Titre du site"
          value={value.siteTitle}
          max={80}
          onChange={(siteTitle) =>
            update(section, { ...value, siteTitle } as SettingsSectionValues[K])
          }
        />
        <Field
          label="Description par défaut"
          value={value.siteDescription}
          multiline
          onChange={(siteDescription) =>
            update(section, { ...value, siteDescription } as SettingsSectionValues[K])
          }
        />
        <Field
          label="Image Open Graph (HTTPS)"
          value={value.ogImageUrl}
          type="url"
          onChange={(ogImageUrl) =>
            update(section, { ...value, ogImageUrl } as SettingsSectionValues[K])
          }
        />
        <Field
          label="URL canonique du site (HTTPS)"
          value={value.canonicalSiteUrl}
          type="url"
          onChange={(canonicalSiteUrl) =>
            update(section, { ...value, canonicalSiteUrl } as SettingsSectionValues[K])
          }
        />
        <Preview title="Aperçu référencement">
          <p className="font-medium">{value.siteTitle || "Titre du site"}</p>
          <p className="text-sm text-muted-foreground">
            {value.siteDescription || "Description par défaut"}
          </p>
          <p className="break-all text-xs">{value.canonicalSiteUrl}</p>
        </Preview>
      </div>
    );
  }
  if (section === "notifications") {
    const value = raw as SettingsSectionValues["notifications"];
    return (
      <div className="grid gap-5">
        <Alert>
          <AlertTitle>{"Secrets dans l'environnement"}</AlertTitle>
          <AlertDescription>
            La clé Resend et le secret cron ne sont jamais stockés ici.
          </AlertDescription>
        </Alert>
        <Field
          label="E-mail des notifications administratives"
          value={value.notificationEmail}
          type="email"
          onChange={(notificationEmail) =>
            update(section, { notificationEmail } as SettingsSectionValues[K])
          }
        />
        <p className="text-sm text-muted-foreground">
          {
            "Le destinataire est figé dans l'intention au moment de l'événement; les intentions existantes ne changent pas."
          }
        </p>
      </div>
    );
  }
  const value = raw as SettingsSectionValues["availability"];
  return (
    <div className="grid gap-5">
      <Toggle
        label="Accepter les nouvelles commandes"
        checked={value.acceptingOrders}
        onChange={(acceptingOrders) =>
          update(section, { ...value, acceptingOrders } as SettingsSectionValues[K])
        }
      />
      <Toggle
        label="Mode maintenance"
        checked={value.maintenanceMode}
        onChange={(maintenanceMode) =>
          update(section, { ...value, maintenanceMode } as SettingsSectionValues[K])
        }
      />
      <Field
        label="Message de maintenance"
        value={value.maintenanceMessage}
        multiline
        onChange={(maintenanceMessage) =>
          update(section, { ...value, maintenanceMessage } as SettingsSectionValues[K])
        }
      />
      <Field
        label="Réouverture prévue"
        value={value.expectedReopeningAt}
        type="datetime-local"
        onChange={(expectedReopeningAt) =>
          update(section, {
            ...value,
            expectedReopeningAt: expectedReopeningAt
              ? new Date(expectedReopeningAt).toISOString()
              : "",
          } as SettingsSectionValues[K])
        }
      />
      <Alert>
        <AlertTitle>Comportement</AlertTitle>
        <AlertDescription>
          {
            "L'arrêt des commandes laisse le catalogue et WhatsApp accessibles. La maintenance remplace uniquement l'expérience publique; admin, auth et API opérationnelles restent accessibles."
          }
        </AlertDescription>
      </Alert>
    </div>
  );
}

function DeliverySection({
  value,
  onChange,
}: {
  value: DeliverySettings;
  onChange: (value: DeliverySettings) => void;
}) {
  const [preview, previewAction, previewPending] = useActionState(
    previewDeliveryQuote,
    previewInitial,
  );
  const [previewInput, setPreviewInput] = useState({
    deliveryMethod: "HOME_DELIVERY",
    city: "Abidjan",
    commune: "",
    subtotalXof: "25000",
  });
  const toggleMethod = (method: DeliveryMethod, enabled: boolean) =>
    onChange({
      ...value,
      enabledDeliveryMethods: enabled
        ? [...new Set([...value.enabledDeliveryMethods, method])]
        : value.enabledDeliveryMethods.filter((item) => item !== method),
    });
  function runPreview() {
    const data = new FormData();
    for (const [key, fieldValue] of Object.entries(previewInput)) data.set(key, fieldValue);
    startTransition(() => previewAction(data));
  }
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        {(["HOME_DELIVERY", "PICKUP"] as DeliveryMethod[]).map((method) => (
          <fieldset key={method} className="grid gap-3 rounded-lg border p-4">
            <legend className="px-1 text-sm font-medium">{deliveryMethodLabels[method]}</legend>
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={value.enabledDeliveryMethods.includes(method)}
                onChange={(event) => toggleMethod(method, event.currentTarget.checked)}
              />{" "}
              Activé
            </label>
            <Field
              label="Libellé client"
              value={value.deliveryMethodConfigs[method].label}
              onChange={(label) =>
                onChange({
                  ...value,
                  deliveryMethodConfigs: {
                    ...value.deliveryMethodConfigs,
                    [method]: { ...value.deliveryMethodConfigs[method], label },
                  },
                })
              }
            />
            <Field
              label="Indication publique"
              value={value.deliveryMethodConfigs[method].publicLabel}
              onChange={(publicLabel) =>
                onChange({
                  ...value,
                  deliveryMethodConfigs: {
                    ...value.deliveryMethodConfigs,
                    [method]: { ...value.deliveryMethodConfigs[method], publicLabel },
                  },
                })
              }
            />
          </fieldset>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Frais par défaut (XOF, vide = zone non couverte)"
          value={value.defaultDeliveryFeeXof ?? ""}
          type="number"
          min={0}
          onChange={(v) => onChange({ ...value, defaultDeliveryFeeXof: nullableNumber(v) })}
        />
        <Field
          label="Frais retrait (XOF)"
          value={value.pickupFeeXof}
          type="number"
          min={0}
          onChange={(v) => onChange({ ...value, pickupFeeXof: Number(v) })}
        />
        <Field
          label="Délai minimum (jours)"
          value={value.deliveryEstimatedMinDays ?? ""}
          type="number"
          min={0}
          onChange={(v) => onChange({ ...value, deliveryEstimatedMinDays: nullableNumber(v) })}
        />
        <Field
          label="Délai maximum (jours)"
          value={value.deliveryEstimatedMaxDays ?? ""}
          type="number"
          min={0}
          onChange={(v) => onChange({ ...value, deliveryEstimatedMaxDays: nullableNumber(v) })}
        />
      </div>
      <Toggle
        label="Livraison offerte selon un seuil"
        checked={value.freeDeliveryEnabled}
        onChange={(freeDeliveryEnabled) => onChange({ ...value, freeDeliveryEnabled })}
      />
      <Field
        label="Seuil livraison offerte (XOF)"
        value={value.freeDeliveryThresholdXof ?? ""}
        type="number"
        min={0}
        onChange={(v) => onChange({ ...value, freeDeliveryThresholdXof: nullableNumber(v) })}
      />
      <section>
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-heading text-2xl">Zones</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onChange({
                ...value,
                zones: [
                  ...value.zones,
                  {
                    id: crypto.randomUUID(),
                    name: "",
                    city: "Abidjan",
                    commune: "",
                    feeXof: 0,
                    estimatedMinDays: null,
                    estimatedMaxDays: null,
                    enabled: true,
                    displayOrder: value.zones.length + 1,
                  },
                ],
              })
            }
          >
            Ajouter une zone
          </Button>
        </div>
        <div className="mt-3 grid gap-3">
          {value.zones.map((zone, index) => {
            const patchZone = (patch: Partial<typeof zone>) =>
              onChange({
                ...value,
                zones: value.zones.map((item) =>
                  item.id === zone.id ? { ...item, ...patch } : item,
                ),
              });
            return (
              <fieldset key={zone.id} className="grid min-w-0 gap-3 rounded-lg border p-4">
                <legend className="px-1 text-sm font-medium">Zone {index + 1}</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field
                    label="Nom"
                    value={zone.name}
                    required
                    onChange={(name) => patchZone({ name })}
                  />
                  <Field
                    label="Ville"
                    value={zone.city}
                    required
                    onChange={(city) => patchZone({ city })}
                  />
                  <Field
                    label="Commune"
                    value={zone.commune}
                    required
                    onChange={(commune) => patchZone({ commune })}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <Field
                    label="Frais XOF"
                    value={zone.feeXof}
                    type="number"
                    min={0}
                    onChange={(v) => patchZone({ feeXof: Number(v) })}
                  />
                  <Field
                    label="Min jours"
                    value={zone.estimatedMinDays ?? ""}
                    type="number"
                    min={0}
                    onChange={(v) => patchZone({ estimatedMinDays: nullableNumber(v) })}
                  />
                  <Field
                    label="Max jours"
                    value={zone.estimatedMaxDays ?? ""}
                    type="number"
                    min={0}
                    onChange={(v) => patchZone({ estimatedMaxDays: nullableNumber(v) })}
                  />
                  <Field
                    label="Ordre"
                    value={zone.displayOrder}
                    type="number"
                    min={0}
                    onChange={(v) => patchZone({ displayOrder: Number(v) })}
                  />
                </div>
                <div className="flex justify-between">
                  <Toggle
                    label="Active"
                    checked={zone.enabled}
                    onChange={(enabled) => patchZone({ enabled })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      onChange({
                        ...value,
                        zones: value.zones.filter((item) => item.id !== zone.id),
                      })
                    }
                  >
                    Retirer
                  </Button>
                </div>
              </fieldset>
            );
          })}
        </div>
      </section>
      <section className="grid gap-3 rounded-lg border bg-surface-muted p-4">
        <h3 className="font-heading text-2xl">Calculateur enregistré</h3>
        <p className="text-xs text-muted-foreground">
          Utilise les règles actuellement enregistrées, pas le brouillon.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Méthode</span>
            <select
              value={previewInput.deliveryMethod}
              onChange={(event) =>
                setPreviewInput((current) => ({
                  ...current,
                  deliveryMethod: event.currentTarget.value,
                }))
              }
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="HOME_DELIVERY">Livraison</option>
              <option value="PICKUP">Retrait</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Ville</span>
            <Input
              value={previewInput.city}
              onChange={(event) =>
                setPreviewInput((current) => ({ ...current, city: event.currentTarget.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Commune</span>
            <Input
              value={previewInput.commune}
              onChange={(event) =>
                setPreviewInput((current) => ({ ...current, commune: event.currentTarget.value }))
              }
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Sous-total XOF</span>
            <Input
              value={previewInput.subtotalXof}
              onChange={(event) =>
                setPreviewInput((current) => ({
                  ...current,
                  subtotalXof: event.currentTarget.value,
                }))
              }
              type="number"
              min={0}
            />
          </label>
        </div>
        <Button type="button" variant="outline" disabled={previewPending} onClick={runPreview}>
          {previewPending ? "Calcul..." : "Tester"}
        </Button>
        {preview.quote ? (
          <p className="text-sm" role="status">
            {preview.quote.status === "AVAILABLE"
              ? `${formatXof(preview.quote.feeXof)} · ${preview.quote.matchedZoneName ?? "tarif par défaut"}${preview.quote.freeDeliveryApplied ? " · livraison offerte" : ""}`
              : preview.quote.status === "UNAVAILABLE"
                ? `Indisponible: ${preview.quote.reason}`
                : "À confirmer"}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />{" "}
      {label}
    </label>
  );
}
function Preview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-lg border bg-surface-muted p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} — aperçu
      </p>
      <div className="min-w-0 break-words">{children}</div>
    </section>
  );
}
