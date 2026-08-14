import type { Metadata } from "next";
import Link from "next/link";

import { LegalDocument } from "@/components/storefront/legal-document";
import { legalPolicyVersions, legalReviewNotice } from "@/lib/legal/policies";
import { getPublicStoreSettings } from "@/lib/settings/service";

export const metadata: Metadata = {
  title: "Conditions générales de vente",
  description: "Conditions applicables aux commandes passées sur Parfum CI Store.",
  alternates: { canonical: "/conditions-generales-de-vente" },
};

export default async function TermsPage() {
  const settings = await getPublicStoreSettings();
  const seller = settings.legalName || settings.storeName;
  const supportEmail = settings.supportEmail || settings.contactEmail;

  return (
    <LegalDocument
      eyebrow="Vente en ligne"
      title="Conditions générales de vente"
      description={`Conditions préparatoires applicables aux commandes proposées par ${seller}.`}
      version={legalPolicyVersions.terms}
      notice={
        <div className="space-y-2 text-sm leading-6">
          <p className="font-semibold">Validation commerciale requise</p>
          <p>
            Les informations légales du vendeur et la politique détaillée de rétractation, retour,
            échange et remboursement doivent être complétées par le responsable et validées au
            regard du droit ivoirien avant d’accepter des commandes réelles. {legalReviewNotice}
          </p>
        </div>
      }
    >
      <section aria-labelledby="terms-seller">
        <h2 id="terms-seller">1. Vendeur et champ d’application</h2>
        <p>
          Les présentes conditions régissent les commandes passées sur ce site auprès de {seller},
          dont les informations complètes figurent dans les{" "}
          <Link href="/mentions-legales">mentions légales</Link>. La langue du parcours de commande
          et du contrat est le français.
        </p>
      </section>

      <section aria-labelledby="terms-products">
        <h2 id="terms-products">2. Produits, disponibilité et prix</h2>
        <p>
          Les caractéristiques, variantes, prix et états de stock sont présentés sur les fiches
          produit. Les prix sont exprimés en francs CFA (XOF), en nombres entiers. Les frais de
          livraison applicables sont calculés séparément et affichés avant l’envoi de la commande.
        </p>
        <p>
          Le panier est rapproché des prix et disponibilités enregistrés par le serveur avant la
          commande. Une réservation de stock n’existe qu’après création effective de la commande ;
          un panier ou l’ouverture de WhatsApp ne réserve aucun article.
        </p>
      </section>

      <section aria-labelledby="terms-order">
        <h2 id="terms-order">3. Formation de la commande</h2>
        <p>
          Avant l’envoi, le client peut relire ses articles, quantités, coordonnées, mode de
          livraison, frais, paiement et total, puis corriger les champs du formulaire. L’envoi de la
          commande nécessite l’acceptation des présentes conditions. Le serveur recalcule le prix,
          les frais et la disponibilité sans faire confiance aux valeurs du navigateur.
        </p>
        <p>
          Après création, un numéro de commande et un accusé de réception sont présentés. La
          commande peut rester en attente de confirmation ou de vérification de paiement selon le
          mode choisi. Le vendeur peut refuser ou annuler une commande en cas d’indisponibilité,
          d’erreur manifeste, de fraude présumée ou d’impossibilité d’exécution, sous réserve des
          règles applicables.
        </p>
      </section>

      <section aria-labelledby="terms-payment">
        <h2 id="terms-payment">4. Paiement</h2>
        <p>
          Seuls les modes activés au moment de la commande sont proposés. Les paiements Mobile Money
          sont vérifiés manuellement à partir des instructions affichées. Le paiement à la livraison
          ou en boutique peut être proposé lorsqu’il est activé. Le statut de paiement est distinct
          du statut de préparation et de livraison.
        </p>
        <p>
          Le client ne doit jamais transmettre son PIN, un OTP, un CVV ou des identifiants de carte.
          Toute instruction demandant ces éléments doit être considérée comme frauduleuse et
          signalée à la boutique.
        </p>
      </section>

      <section aria-labelledby="terms-delivery">
        <h2 id="terms-delivery">5. Livraison et retrait</h2>
        <p>
          Les modes, zones, frais et estimations disponibles sont présentés pendant la commande et
          sur la <Link href="/livraison">page Livraison</Link>. Les délais sont des estimations sauf
          engagement exprès contraire. Le client doit fournir des coordonnées et indications exactes
          permettant l’exécution de la livraison ou du retrait.
        </p>
      </section>

      <section aria-labelledby="terms-returns">
        <h2 id="terms-returns">6. Annulation, retour, échange et remboursement</h2>
        <p>
          La politique commerciale détaillée n’est pas encore approuvée dans le dépôt. Avant
          l’ouverture commerciale, le vendeur doit publier les délais, conditions, exclusions
          légales, état attendu des produits, procédure de retour, frais éventuels et mode de
          remboursement applicables. Ce paragraphe ne réduit aucun droit impératif du consommateur.
        </p>
        <p>
          Dans l’intervalle, toute demande doit être adressée avant utilisation ou ouverture du
          produit à{" "}
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          ) : (
            " l’adresse de support à compléter"
          )}
          .
        </p>
      </section>

      <section aria-labelledby="terms-complaints">
        <h2 id="terms-complaints">7. Réclamations et données personnelles</h2>
        <p>
          Les réclamations peuvent être transmises depuis la{" "}
          <Link href="/contact">page de contact</Link>, avec le numéro de commande lorsque celui-ci
          existe. Le traitement des données personnelles est décrit dans la{" "}
          <Link href="/politique-de-confidentialite">politique de confidentialité</Link>.
        </p>
      </section>

      <section aria-labelledby="terms-evidence">
        <h2 id="terms-evidence">8. Preuve, conservation et droit applicable</h2>
        <p>
          Les enregistrements de commande, paiement, statut, stock et notification sont conservés
          dans le système pour assurer la traçabilité selon les durées applicables. Le client est
          invité à conserver les présentes conditions et sa confirmation de commande sur un support
          durable. Les conditions actuellement acceptées ne sont pas encore associées à un
          identifiant de version dans chaque commande ; cette limite doit être corrigée ou
          expressément acceptée après conseil juridique avant l’ouverture commerciale.
        </p>
        <p>
          Les présentes conditions sont soumises au droit ivoirien, sans priver le consommateur des
          protections impératives qui lui sont applicables. Les parties rechercheront d’abord une
          solution amiable avant toute procédure devant l’autorité ou la juridiction compétente.
        </p>
      </section>
    </LegalDocument>
  );
}
