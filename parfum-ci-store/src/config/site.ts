import type { LucideIcon } from "lucide-react";
import { Camera, MessageCircle, Users } from "lucide-react";

export type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type NavigationItem = {
  label: string;
  href: string;
};

export const siteConfig = {
  name: "Parfum CI",
  description: "Parfumerie premium en Côte d'Ivoire.",
  navigation: [
    { label: "Accueil", href: "/" },
    { label: "Catalogue", href: "/catalogue" },
    { label: "Contact", href: "/contact" },
  ] satisfies NavigationItem[],
  socialLinks: [
    { label: "Instagram", href: "https://instagram.com", icon: Camera },
    { label: "Facebook", href: "https://facebook.com", icon: Users },
    { label: "WhatsApp", href: "https://wa.me/2250000000000", icon: MessageCircle },
  ] satisfies SocialLink[],
};
