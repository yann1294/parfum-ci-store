import type { LucideIcon } from "lucide-react";
import { Camera, MessageCircle, Music2, Users } from "lucide-react";

import { getPublicEnv } from "@/lib/env/public";

export type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationItem = {
  label: string;
  href: string;
};

export function normalizeWhatsAppNumber(value: string | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

const publicEnv = getPublicEnv();
const whatsappNumber = normalizeWhatsAppNumber(publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER);

export function buildSocialLinks(input: {
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  whatsappNumber?: string | null;
}) {
  const normalizedWhatsApp = normalizeWhatsAppNumber(input.whatsappNumber ?? undefined);

  return [
    input.instagramUrl ? { label: "Instagram", href: input.instagramUrl, icon: Camera } : null,
    input.facebookUrl ? { label: "Facebook", href: input.facebookUrl, icon: Users } : null,
    input.tiktokUrl ? { label: "TikTok", href: input.tiktokUrl, icon: Music2 } : null,
    normalizedWhatsApp ? { label: "WhatsApp", href: `https://wa.me/${normalizedWhatsApp}`, icon: MessageCircle } : null,
  ].filter(Boolean) as SocialLink[];
}

export const siteConfig = {
  name: publicEnv.NEXT_PUBLIC_SITE_NAME,
  description: "Parfumerie premium en Côte d'Ivoire.",
  siteUrl: cleanBaseUrl(publicEnv.NEXT_PUBLIC_SITE_URL),
  heroTitle: "Parfums raffinés, sélectionnés pour la Côte d'Ivoire.",
  heroDescription:
    "Découvrez une sélection premium de parfums authentiques, avec prix en F CFA et commande assistée par WhatsApp.",
  primaryCta: "Découvrir le catalogue",
  whatsappNumber,
  whatsappDefaultText: "Bonjour, je souhaite avoir des informations sur vos parfums.",
  contactEmail: publicEnv.NEXT_PUBLIC_CONTACT_EMAIL ?? null,
  deliveryCopy:
    "Livraison locale selon disponibilité et confirmation manuelle. Les frais sont confirmés avant validation de commande.",
  paymentCopy:
    "Paiement Mobile Money manuel ou paiement à la livraison selon les conditions confirmées avec l'équipe.",
  trustPoints: [
    "Sélection premium en français",
    "Prix affichés en F CFA",
    "Commande accompagnée par WhatsApp",
  ],
  orderingSteps: [
    "Choisissez un parfum et une contenance.",
    "Ajoutez-le au panier ou contactez-nous sur WhatsApp.",
    "Confirmez la disponibilité, le paiement et la livraison avec l'équipe.",
  ],
  navigation: [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "À propos", href: "/a-propos" },
    { label: "Livraison", href: "/livraison" },
    { label: "Contact", href: "/contact" },
    { label: "Panier", href: "/panier" },
  ] satisfies NavigationItem[],
  socialLinks: buildSocialLinks({
    instagramUrl: publicEnv.NEXT_PUBLIC_INSTAGRAM_URL,
    facebookUrl: publicEnv.NEXT_PUBLIC_FACEBOOK_URL,
    tiktokUrl: publicEnv.NEXT_PUBLIC_TIKTOK_URL,
    whatsappNumber,
  }),
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.siteUrl}${normalizedPath}`;
}

export function buildWhatsAppUrl(message: string) {
  if (!siteConfig.whatsappNumber) return null;
  return buildWhatsAppUrlForNumber(siteConfig.whatsappNumber, message);
}

export function buildWhatsAppUrlForNumber(number: string | null, message: string) {
  if (!number) return null;
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${number}?${params.toString()}`;
}
