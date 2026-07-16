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

function normalizeWhatsAppNumber(value: string | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

const publicEnv = getPublicEnv();
const whatsappNumber = normalizeWhatsAppNumber(publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER);

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
  socialLinks: [
    publicEnv.NEXT_PUBLIC_INSTAGRAM_URL
      ? { label: "Instagram", href: publicEnv.NEXT_PUBLIC_INSTAGRAM_URL, icon: Camera }
      : null,
    publicEnv.NEXT_PUBLIC_FACEBOOK_URL
      ? { label: "Facebook", href: publicEnv.NEXT_PUBLIC_FACEBOOK_URL, icon: Users }
      : null,
    publicEnv.NEXT_PUBLIC_TIKTOK_URL
      ? { label: "TikTok", href: publicEnv.NEXT_PUBLIC_TIKTOK_URL, icon: Music2 }
      : null,
    whatsappNumber
      ? { label: "WhatsApp", href: `https://wa.me/${whatsappNumber}`, icon: MessageCircle }
      : null,
  ].filter(Boolean) as SocialLink[],
};

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.siteUrl}${normalizedPath}`;
}

export function buildWhatsAppUrl(message: string) {
  if (!siteConfig.whatsappNumber) return null;
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${siteConfig.whatsappNumber}?${params.toString()}`;
}
