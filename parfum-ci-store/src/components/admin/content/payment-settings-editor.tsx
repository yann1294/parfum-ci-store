"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";

import { updatePaymentSettings, type PaymentSettingsActionState } from "@/app/admin/contenu/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultPaymentConfigs,
  supportedPaymentMethods,
  type PaymentMethodConfig,
} from "@/lib/orders/payment-settings-core";
import { paymentMethodLabel, paymentMethodIsMobileMoney, type PaymentMethod } from "@/lib/orders/display";

const initialState: PaymentSettingsActionState = { ok: false, message: "" };

export function PaymentSettingsEditor({
  configs,
}: {
  configs: Record<PaymentMethod, PaymentMethodConfig>;
}) {
  const [draft, setDraft] = useState(configs);
  const [, formAction] = useActionState(async (previousState: PaymentSettingsActionState, formData: FormData) => {
    const nextState = await updatePaymentSettings(previousState, formData);
    if (nextState.ok && nextState.value) {
      setDraft({ ...defaultPaymentConfigs([]), ...nextState.value });
      toast.success(nextState.message);
    } else if (nextState.message) {
      toast.error(nextState.message);
    }
    return nextState;
  }, initialState);

  function update(method: PaymentMethod, patch: Partial<PaymentMethodConfig>) {
    setDraft((current) => ({
      ...current,
      [method]: {
        ...current[method],
        ...patch,
      },
    }));
  }

  return (
    <section className="rounded-lg border bg-surface p-5">
      <div className="mb-5">
        <h2 className="font-heading text-3xl">Paiements</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Activez uniquement les modes que les clients peuvent choisir et configurez les instructions publiques.
        </p>
      </div>
      <Alert className="mb-5">
        <AlertTitle>Instructions publiques</AlertTitle>
        <AlertDescription>
          Les numéros marchands, bénéficiaires et consignes renseignés ici sont visibles par les clients. Ne saisissez aucun secret, PIN, OTP ou métadonnée privée.
        </AlertDescription>
      </Alert>
      <form action={formAction} className="grid gap-4">
        {supportedPaymentMethods.map((method) => {
          const config = draft[method];
          const requiresMerchant = paymentMethodIsMobileMoney(method);
          const requiresInstructions = method !== "CASH_ON_DELIVERY";
          return (
            <fieldset key={method} className="grid gap-3 rounded-lg border p-4">
              <legend className="px-1 text-sm font-medium">{paymentMethodLabel(method)}</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name={`${method}.enabled`}
                  checked={config.enabled}
                  onChange={(event) => update(method, { enabled: event.currentTarget.checked })}
                />
                Activé
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <label className="grid gap-1 text-sm">
                  Libellé client
                  <Input
                    name={`${method}.label`}
                    value={config.label}
                    onChange={(event) => update(method, { label: event.currentTarget.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Ordre
                  <Input
                    name={`${method}.displayOrder`}
                    type="number"
                    min={0}
                    max={100}
                    value={config.displayOrder}
                    onChange={(event) =>
                      update(method, { displayOrder: Number.parseInt(event.currentTarget.value, 10) || 50 })
                    }
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Numéro marchand{requiresMerchant ? " requis" : ""}
                  <Input
                    name={`${method}.merchantNumber`}
                    value={config.merchantNumber}
                    onChange={(event) => update(method, { merchantNumber: event.currentTarget.value })}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Bénéficiaire
                  <Input
                    name={`${method}.beneficiaryName`}
                    value={config.beneficiaryName}
                    onChange={(event) => update(method, { beneficiaryName: event.currentTarget.value })}
                  />
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Instructions client{requiresInstructions ? " requises" : ""}
                <Textarea
                  name={`${method}.instructions`}
                  value={config.instructions}
                  onChange={(event) => update(method, { instructions: event.currentTarget.value })}
                  rows={3}
                />
              </label>
            </fieldset>
          );
        })}
        <div className="flex justify-end">
          <Button type="submit">Enregistrer les paiements</Button>
        </div>
      </form>
    </section>
  );
}
