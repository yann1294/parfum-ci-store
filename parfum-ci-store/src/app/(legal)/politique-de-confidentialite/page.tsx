import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/storefront/legal-document";
import { legalPolicyVersions, legalReviewNotice } from "@/lib/legal/policies";
import { getPublicStoreSettings } from "@/lib/settings/service";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Comment Parfum CI Store collecte, utilise et protège les données personnelles.",
  alternates: { canonical: "/politique-de-confidentialite" },
};

export default async function PrivacyPolicyPage() {
  const settings = await getPublicStoreSettings();
  const controller = settings.legalName || settings.storeName;
  const privacyEmail = settings.supportEmail || settings.contactEmail;

  return (
    <LegalDocument
      eyebrow="Données personnelles"
      title="Politique de confidentialité"
      description="Cette politique explique les données traitées lorsque vous consultez la boutique, passez une commande, suivez une commande ou contactez l’équipe."
      version={legalPolicyVersions.privacy}
      notice={
        <p className="text-sm leading-6">
          {legalReviewNotice} Le responsable doit notamment confirmer les formalités applicables
          auprès de l’Autorité de protection, les durées internes de conservation et l’encadrement
          des transferts internationaux avant l’ouverture commerciale.
        </p>
      }
    >
      <section aria-labelledby="privacy-controller">
        <h2 id="privacy-controller">Responsable du traitement</h2>
        <p>
          Le responsable déclaré est {controller}. Adresse :{" "}
          {settings.primaryAddress || "à compléter"}. Contact vie privée :{" "}
          {privacyEmail || "à compléter avant ouverture commerciale"}.
        </p>
      </section>

      <section aria-labelledby="privacy-data">
        <h2 id="privacy-data">Données traitées</h2>
        <ul>
          <li>identité et coordonnées fournies lors d’une commande ou d’un message ;</li>
          <li>adresse et indications nécessaires à la livraison ;</li>
          <li>contenu du panier, commande, livraison et historique de statut ;</li>
          <li>méthode de paiement choisie et références de vérification manuelle ;</li>
          <li>messages adressés à la boutique et suivi interne de leur traitement ;</li>
          <li>
            données techniques limitées nécessaires à la sécurité, à la prévention des abus et au
            fonctionnement du site ;
          </li>
          <li>
            source de visite ou paramètres UTM lorsqu’ils sont présents lors d’une commande ou d’un
            contact.
          </li>
        </ul>
        <p>
          La boutique ne demande jamais de code PIN Mobile Money, d’OTP, de CVV ni de données de
          carte bancaire dans ses formulaires.
        </p>
      </section>

      <section aria-labelledby="privacy-purposes">
        <h2 id="privacy-purposes">Finalités et caractère obligatoire</h2>
        <ul>
          <li>présenter le catalogue et conserver localement votre panier ;</li>
          <li>créer, confirmer, préparer, livrer et suivre une commande ;</li>
          <li>calculer les frais de livraison et vérifier un paiement manuel ;</li>
          <li>répondre aux demandes de contact et assurer le support client ;</li>
          <li>envoyer les notifications opérationnelles liées à ces actions ;</li>
          <li>sécuriser le service, limiter les abus et conserver les preuves nécessaires.</li>
        </ul>
        <p>
          Les champs marqués comme obligatoires sont nécessaires au service demandé. Sans eux, la
          commande ou la demande concernée ne peut pas être traitée. La création d’un compte client
          n’est pas requise.
        </p>
      </section>

      <section aria-labelledby="privacy-recipients">
        <h2 id="privacy-recipients">Destinataires et sous-traitants</h2>
        <p>
          Les données sont accessibles uniquement aux membres du personnel autorisés selon leur
          rôle. Elles peuvent être traitées par Vercel pour l’hébergement de l’application, Supabase
          pour l’authentification, la base de données et le stockage, et Resend pour les
          notifications électroniques. Les partenaires de livraison ne doivent recevoir que les
          informations nécessaires à la livraison, lorsqu’ils sont effectivement sollicités.
        </p>
        <p>
          Ces prestataires peuvent traiter des données hors de Côte d’Ivoire. Le responsable de la
          boutique doit vérifier et documenter les garanties contractuelles et autorisations
          applicables avant la mise en production commerciale.
        </p>
      </section>

      <section aria-labelledby="privacy-retention">
        <h2 id="privacy-retention">Conservation</h2>
        <p>
          Les données sont conservées pendant la durée nécessaire à la commande, au support, à la
          sécurité et aux obligations légales, comptables ou probatoires applicables. Les
          historiques d’ordre, de paiement, de stock et d’audit sont conçus pour préserver la
          traçabilité. Une durée opérationnelle détaillée et une procédure de suppression doivent
          être approuvées par le responsable avant l’ouverture commerciale ; aucune suppression
          automatique générale ne doit être supposée à ce jour.
        </p>
      </section>

      <section aria-labelledby="privacy-storage">
        <h2 id="privacy-storage">Cookies et stockage local</h2>
        <p>
          Le site utilise les mécanismes strictement utiles à la session d’administration, au thème,
          au panier et à la conservation temporaire de l’attribution de visite. Aucun outil de
          publicité comportementale n’est intégré dans l’état actuel du MVP. Effacer le stockage du
          navigateur peut supprimer le panier ou les préférences locales.
        </p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">Vos droits</h2>
        <p>
          Sous réserve des conditions prévues par le droit ivoirien, vous pouvez demander l’accès,
          la rectification, l’opposition ou l’effacement de vos données. Adressez votre demande à
          {privacyEmail ? (
            <>
              {" "}
              <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>
            </>
          ) : (
            " l’adresse qui doit être complétée dans les mentions légales"
          )}
          . Une vérification d’identité proportionnée peut être demandée avant de répondre.
        </p>
        <p>
          Vous pouvez également consulter l’Autorité de protection de Côte d’Ivoire sur{" "}
          <a href="https://www.autoritedeprotection.ci" rel="noopener noreferrer">
            autoritedeprotection.ci
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="privacy-security">
        <h2 id="privacy-security">Sécurité et mise à jour</h2>
        <p>
          Des contrôles d’accès, validations, journaux d’audit et protections de base de données
          limitent l’accès non autorisé. Aucun service ne peut toutefois garantir un risque nul. Les
          modifications importantes de cette politique seront publiées sur cette page avec une
          nouvelle date de version.
        </p>
        <p>
          Pour les conditions applicables aux achats, consultez les{" "}
          <Link href="/conditions-generales-de-vente">conditions générales de vente</Link>.
        </p>
      </section>
    </LegalDocument>
  );
}
