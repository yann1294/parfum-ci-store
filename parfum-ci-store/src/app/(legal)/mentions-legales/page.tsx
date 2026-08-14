import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/storefront/legal-document";
import { legalPolicyVersions, legalReviewNotice } from "@/lib/legal/policies";
import { getPublicStoreSettings } from "@/lib/settings/service";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Identification, hébergement et conditions d’utilisation de Parfum CI Store.",
  alternates: { canonical: "/mentions-legales" },
};

export default async function LegalNoticePage() {
  const settings = await getPublicStoreSettings();
  const operatorName = settings.legalName || settings.storeName;
  const publicEmail = settings.supportEmail || settings.contactEmail;

  return (
    <LegalDocument
      eyebrow="Informations juridiques"
      title="Mentions légales"
      description="Informations relatives à l’éditeur, aux prestataires techniques et à l’utilisation de ce site."
      version={legalPolicyVersions.legalNotice}
      notice={
        <div className="space-y-2 text-sm leading-6">
          <p className="font-semibold">Informations d’immatriculation à compléter</p>
          <p>
            La forme juridique, le capital social, le siège social, le numéro RCCM, le numéro fiscal
            et l’identité du directeur de publication ne sont pas encore gérés par les paramètres de
            la boutique. Ils doivent être renseignés et validés avant toute ouverture commerciale.{" "}
            {legalReviewNotice}
          </p>
        </div>
      }
    >
      <section aria-labelledby="legal-editor">
        <h2 id="legal-editor">Éditeur du site</h2>
        <dl className="mt-4 grid gap-3 rounded-lg border bg-surface p-5 text-sm sm:grid-cols-[12rem_1fr]">
          <dt className="font-medium">Nom commercial</dt>
          <dd>{settings.storeName}</dd>
          <dt className="font-medium">Exploitant déclaré</dt>
          <dd>{operatorName}</dd>
          <dt className="font-medium">Adresse principale</dt>
          <dd>{settings.primaryAddress || "À compléter avant ouverture commerciale"}</dd>
          {settings.secondaryAddress ? (
            <>
              <dt className="font-medium">Adresse complémentaire</dt>
              <dd>{settings.secondaryAddress}</dd>
            </>
          ) : null}
          <dt className="font-medium">E-mail</dt>
          <dd>{publicEmail || "À compléter avant ouverture commerciale"}</dd>
          <dt className="font-medium">Téléphone</dt>
          <dd>{settings.contactPhone || "À compléter avant ouverture commerciale"}</dd>
          <dt className="font-medium">RCCM et identification fiscale</dt>
          <dd>À compléter avant ouverture commerciale</dd>
        </dl>
      </section>

      <section aria-labelledby="legal-hosting">
        <h2 id="legal-hosting">Hébergement et prestataires techniques</h2>
        <p>
          L’application web est hébergée par Vercel. Les services de base de données,
          d’authentification et de stockage sont fournis par Supabase. L’envoi des notifications
          électroniques de l’application peut être assuré par Resend.
        </p>
        <ul>
          <li>
            Vercel —{" "}
            <a href="https://vercel.com" rel="noopener noreferrer">
              vercel.com
            </a>
          </li>
          <li>
            Supabase —{" "}
            <a href="https://supabase.com" rel="noopener noreferrer">
              supabase.com
            </a>
          </li>
          <li>
            Resend —{" "}
            <a href="https://resend.com" rel="noopener noreferrer">
              resend.com
            </a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="legal-property">
        <h2 id="legal-property">Propriété intellectuelle</h2>
        <p>
          Les textes, visuels, marques, logos, éléments graphiques et logiciels restent protégés par
          les droits de leurs titulaires respectifs. Leur présence sur ce site ne constitue pas une
          autorisation de reproduction ou de réutilisation.
        </p>
      </section>

      <section aria-labelledby="legal-contact">
        <h2 id="legal-contact">Contact</h2>
        <p>
          Pour toute question relative au site, utilisez les coordonnées ci-dessus ou le formulaire
          de la <Link href="/contact">page de contact</Link>. Pour le traitement des données
          personnelles, consultez la{" "}
          <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
