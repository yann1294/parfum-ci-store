import { aboutContentSchema, contactContentSchema, deliveryContentSchema, socialContentSchema } from "../../src/lib/storefront/content-schemas";
import type { Database, Json } from "../../src/types/database.types";

export const PHASE65_MANUAL_PREFIX = "MANUAL-65-20260716";
export const PHASE65_MANUAL_SLUG_SUFFIX = "manual-65-20260716";
export const PHASE65_MANUAL_SKU_SUFFIX = "MANUAL65";
export const PHASE65_MANUAL_DESCRIPTION = `Données de test manuel ${PHASE65_MANUAL_PREFIX}. À remplacer avant production.`;

export const categories = [
  { name: "Men", slug: "men" },
  { name: "Women", slug: "women" },
  { name: "Unisex", slug: "unisex" },
  { name: "Luxury", slug: "luxury" },
  { name: "Designer", slug: "designer" },
  { name: "Arabic", slug: "arabic" },
  { name: "Fresh", slug: "fresh" },
  { name: "Woody", slug: "woody" },
  { name: "Oriental", slug: "oriental" },
  { name: "Gift Set", slug: "gift-set" },
] as const;

export const brands = [
  { name: "Dior" },
  { name: "Yves Saint Laurent" },
  { name: "Maison Francis Kurkdjian" },
  { name: "Creed" },
  { name: "Lattafa" },
  { name: "Maison Margiela" },
  { name: "Tom Ford" },
  { name: "Chanel" },
  { name: "Gucci" },
  { name: "Giorgio Armani" },
  { name: "Jean Paul Gaultier" },
  { name: "Paco Rabanne" },
  { name: "Versace" },
  { name: "Hermès" },
  { name: "Jo Malone London" },
  { name: "Narciso Rodriguez" },
  { name: "Louis Vuitton" },
] as const;

export type SourceProduct = {
  name: string;
  brand: string;
  category: (typeof categories)[number]["name"];
  description: string;
  sizes: string[];
  price: number;
  stock: number;
  image: null;
};

export const products = [
  {
    name: "Sauvage Eau de Parfum",
    brand: "Dior",
    category: "Men",
    description: "Fresh spicy masculine fragrance",
    sizes: ["60ml", "100ml", "200ml"],
    price: 95,
    stock: 15,
    image: null,
  },
  {
    name: "Libre Intense",
    brand: "Yves Saint Laurent",
    category: "Women",
    description: "Warm floral lavender",
    sizes: ["50ml", "90ml"],
    price: 125,
    stock: 10,
    image: null,
  },
  {
    name: "Baccarat Rouge 540",
    brand: "Maison Francis Kurkdjian",
    category: "Luxury",
    description: "Amber floral",
    sizes: ["70ml", "200ml"],
    price: 420,
    stock: 6,
    image: null,
  },
  {
    name: "Aventus",
    brand: "Creed",
    category: "Men",
    description: "Pineapple woody",
    sizes: ["50ml", "100ml"],
    price: 330,
    stock: 7,
    image: null,
  },
  {
    name: "Khamrah",
    brand: "Lattafa",
    category: "Arabic",
    description: "Sweet spicy oriental",
    sizes: ["100ml"],
    price: 45,
    stock: 20,
    image: null,
  },
  {
    name: "By the Fireplace",
    brand: "Maison Margiela",
    category: "Unisex",
    description: "Warm smoky vanilla",
    sizes: ["100ml"],
    price: 135,
    stock: 8,
    image: null,
  },
  {
    name: "Oud Wood",
    brand: "Tom Ford",
    category: "Woody",
    description: "Luxury oud fragrance",
    sizes: ["50ml", "100ml"],
    price: 280,
    stock: 5,
    image: null,
  },
  {
    name: "Lost Cherry",
    brand: "Tom Ford",
    category: "Luxury",
    description: "Cherry almond",
    sizes: ["50ml", "100ml"],
    price: 310,
    stock: 4,
    image: null,
  },
  {
    name: "Bleu de Chanel Eau de Parfum",
    brand: "Chanel",
    category: "Men",
    description: "Woody aromatic fragrance",
    sizes: ["50ml", "100ml"],
    price: 115,
    stock: 12,
    image: null,
  },
  {
    name: "My Way Eau de Parfum",
    brand: "Giorgio Armani",
    category: "Women",
    description: "Fresh floral fruity",
    sizes: ["50ml", "90ml"],
    price: 105,
    stock: 11,
    image: null,
  },
  {
    name: "Acqua di Giò Profondo",
    brand: "Giorgio Armani",
    category: "Fresh",
    description: "Marine aromatic",
    sizes: ["75ml", "125ml"],
    price: 110,
    stock: 9,
    image: null,
  },
  {
    name: "La Belle Le Parfum",
    brand: "Jean Paul Gaultier",
    category: "Women",
    description: "Sweet vanilla coffee fragrance",
    sizes: ["50ml", "100ml"],
    price: 120,
    stock: 8,
    image: null,
  },
  {
    name: "1 Million Elixir",
    brand: "Paco Rabanne",
    category: "Men",
    description: "Warm spicy leather",
    sizes: ["50ml", "100ml"],
    price: 115,
    stock: 10,
    image: null,
  },
  {
    name: "Eros Eau de Toilette",
    brand: "Versace",
    category: "Men",
    description: "Fresh mint vanilla",
    sizes: ["50ml", "100ml"],
    price: 85,
    stock: 14,
    image: null,
  },
  {
    name: "Terre d'Hermès Eau de Toilette",
    brand: "Hermès",
    category: "Woody",
    description: "Fresh aquatic",
    sizes: ["50ml", "100ml"],
    price: 105,
    stock: 10,
    image: null,
  },
  {
    name: "English Pear & Freesia",
    brand: "Jo Malone London",
    category: "Fresh",
    description: "Clean musk floral",
    sizes: ["30ml", "100ml"],
    price: 95,
    stock: 9,
    image: null,
  },
  {
    name: "Ombre Nomade",
    brand: "Louis Vuitton",
    category: "Luxury",
    description: "Rich smoky oud",
    sizes: ["100ml"],
    price: 420,
    stock: 5,
    image: null,
  },
  {
    name: "For Her Musc Noir Rose",
    brand: "Narciso Rodriguez",
    category: "Women",
    description: "Warm floral musk",
    sizes: ["50ml", "100ml"],
    price: 105,
    stock: 8,
    image: null,
  },
  {
    name: "Guilty Pour Homme",
    brand: "Gucci",
    category: "Men",
    description: "Aromatic lavender citrus",
    sizes: ["50ml", "90ml"],
    price: 90,
    stock: 12,
    image: null,
  },
  {
    name: "Si Passione Eau de Parfum",
    brand: "Giorgio Armani",
    category: "Women",
    description: "Fruity floral vanilla",
    sizes: ["50ml", "100ml"],
    price: 110,
    stock: 9,
    image: null,
  },
  {
    name: "Fakhar Black",
    brand: "Lattafa",
    category: "Arabic",
    description: "Fresh spicy aromatic",
    sizes: ["100ml"],
    price: 35,
    stock: 18,
    image: null,
  },
  {
    name: "Asad",
    brand: "Lattafa",
    category: "Arabic",
    description: "Warm amber spicy",
    sizes: ["100ml"],
    price: 38,
    stock: 16,
    image: null,
  },
  {
    name: "J'adore Eau de Parfum",
    brand: "Dior",
    category: "Women",
    description: "Classic floral bouquet",
    sizes: ["50ml", "100ml"],
    price: 120,
    stock: 9,
    image: null,
  },
  {
    name: "Black Opium Eau de Parfum",
    brand: "Yves Saint Laurent",
    category: "Women",
    description: "Coffee vanilla floral",
    sizes: ["50ml", "90ml"],
    price: 118,
    stock: 11,
    image: null,
  },
  {
    name: "Light Blue Pour Homme Eau de Toilette",
    brand: "Dior",
    category: "Fresh",
    description: "Fresh citrus aquatic",
    sizes: ["75ml", "125ml"],
    price: 80,
    stock: 13,
    image: null,
  },
] satisfies SourceProduct[];

export const categoryDisplayNames = {
  Men: "Homme",
  Women: "Femme",
  Unisex: "Unisexe",
  Luxury: "Luxe",
  Designer: "Créateurs",
  Arabic: "Parfums arabes",
  Fresh: "Frais",
  Woody: "Boisés",
  Oriental: "Orientaux",
  "Gift Set": "Coffrets cadeaux",
} as const satisfies Record<(typeof categories)[number]["name"], string>;

export const featuredProductNames = [
  "Sauvage Eau de Parfum",
  "Libre Intense",
  "Baccarat Rouge 540",
  "Aventus",
  "Khamrah",
  "By the Fireplace",
] as const;

export const activeIntendedProductNames = products.slice(0, 15).map((product) => product.name);

export const allowedConcentrations = ["EDP", "EDT", "PARFUM"] as const;
export const allowedPublicTargets = ["HOMME", "FEMME", "UNISEXE"] as const;
export const allowedFragranceFamilies = [
  "Florale",
  "Boisée",
  "Ambrée",
  "Aromatique",
  "Gourmande",
  "Cuirée",
  "Aquatique",
  "Orientale",
] as const;

type BrandRow = Database["public"]["Tables"]["brands"]["Insert"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Insert"];
type ProductRow = Database["public"]["Tables"]["products"]["Insert"];
type VariantRow = Database["public"]["Tables"]["product_variants"]["Insert"];
type StoreContentInsert = {
  page_key: "about" | "contact" | "delivery" | "social";
  content: Json;
  public_readable: boolean;
};

export type NormalizedProductSeed = {
  source: SourceProduct;
  slug: string;
  categorySlug: string;
  brandSlug: string;
  concentration: (typeof allowedConcentrations)[number];
  publicTarget: (typeof allowedPublicTargets)[number];
  fragranceFamily: (typeof allowedFragranceFamilies)[number];
  featured: boolean;
  activeIntended: boolean;
  variants: Array<{
    sku: string;
    sizeMl: number;
    priceXof: number;
    compareAtPriceXof: number | null;
    costPriceXof: number;
    stockOnHand: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    active: boolean;
    concentration: (typeof allowedConcentrations)[number];
  }>;
};

function sanitizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function sanitizeSkuPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function brandSlug(name: string) {
  return sanitizeSlug(name);
}

export function productSlug(name: string) {
  return `${sanitizeSlug(name)}-${PHASE65_MANUAL_SLUG_SUFFIX}`;
}

export function parseSizeMl(size: string) {
  const match = /^(\d{1,4})ml$/i.exec(size.trim());
  if (!match) throw new Error(`Invalid fixture size "${size}". Use an integer ml value.`);
  return Number.parseInt(match[1], 10);
}

export function priceToXof(sourcePrice: number) {
  if (!Number.isInteger(sourcePrice) || sourcePrice <= 0) {
    throw new Error("Invalid fixture price. Source price must be a positive integer.");
  }
  return sourcePrice * 1000;
}

export function roundDownToNearest500(value: number) {
  return Math.floor(value / 500) * 500;
}

export function concentrationForProduct(name: string): (typeof allowedConcentrations)[number] {
  if (/eau de toilette/i.test(name)) return "EDT";
  if (/le parfum/i.test(name)) return "PARFUM";
  if (/eau de parfum/i.test(name)) return "EDP";
  return "EDP";
}

export function publicTargetForCategory(category: SourceProduct["category"]): (typeof allowedPublicTargets)[number] {
  if (category === "Men") return "HOMME";
  if (category === "Women") return "FEMME";
  return "UNISEXE";
}

export function fragranceFamilyForProduct(
  product: Pick<SourceProduct, "category" | "description">,
): (typeof allowedFragranceFamilies)[number] {
  const description = product.description.toLowerCase();
  if (description.includes("coffee") || description.includes("vanilla") || description.includes("cherry") || description.includes("almond")) {
    return "Gourmande";
  }
  if (description.includes("oud") || description.includes("woody") || product.category === "Woody") {
    return "Boisée";
  }
  if (description.includes("aquatic") || description.includes("marine")) {
    return "Aquatique";
  }
  if (description.includes("leather")) {
    return "Cuirée";
  }
  if (description.includes("amber") || description.includes("cardamom")) {
    return "Ambrée";
  }
  if (description.includes("oriental")) {
    return "Orientale";
  }
  if (description.includes("floral") || description.includes("lavender")) {
    return "Florale";
  }
  return "Aromatique";
}

function skuBase(name: string) {
  const words = sanitizeSkuPart(name)
    .split("-")
    .filter((part) => !["EAU", "DE", "DU", "DI", "LE", "LA", "PARFUM", "TOILETTE", "POUR", "HOMME"].includes(part));
  return (words[0] ?? "PARFUM").slice(0, 14);
}

export function generateSku(input: { productName: string; sizeMl: number; concentration: string }) {
  return `${skuBase(input.productName)}-${input.sizeMl}-${sanitizeSkuPart(input.concentration)}-${PHASE65_MANUAL_SKU_SUFFIX}`;
}

function stockOverride(productName: string, sizeMl: number, suppliedStock: number) {
  if (productName === "Khamrah" && sizeMl === 100) {
    return { stockOnHand: 20, reservedQuantity: 0, lowStockThreshold: 5, active: true };
  }
  if (productName === "Oud Wood" && sizeMl === 50) {
    return { stockOnHand: 3, reservedQuantity: 1, lowStockThreshold: 5, active: true };
  }
  if (productName === "Lost Cherry" && sizeMl === 50) {
    return { stockOnHand: 2, reservedQuantity: 2, lowStockThreshold: 5, active: true };
  }
  if (productName === "Sauvage Eau de Parfum" && sizeMl === 60) {
    return { stockOnHand: 15, reservedQuantity: 0, lowStockThreshold: 5, active: true };
  }
  if (productName === "Sauvage Eau de Parfum" && sizeMl === 100) {
    return { stockOnHand: 12, reservedQuantity: 10, lowStockThreshold: 5, active: true };
  }
  if (productName === "Sauvage Eau de Parfum" && sizeMl === 200) {
    return { stockOnHand: 5, reservedQuantity: 5, lowStockThreshold: 5, active: true };
  }
  return { stockOnHand: suppliedStock, reservedQuantity: 0, lowStockThreshold: 5, active: true };
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate fixture ${label}: ${value}.`);
    seen.add(value);
  }
}

export function normalizePhase65Products(input: SourceProduct[] = products): NormalizedProductSeed[] {
  const knownBrands = new Set<string>(brands.map((brand) => brand.name));
  const categoryByName = new Map(categories.map((category) => [category.name, category]));
  const normalized = input.map((product) => {
    if (!knownBrands.has(product.brand)) {
      throw new Error(`Missing fixture brand for product "${product.name}".`);
    }
    const category = categoryByName.get(product.category);
    if (!category) {
      throw new Error(`Missing fixture category for product "${product.name}".`);
    }
    if (!Number.isInteger(product.stock) || product.stock < 0) {
      throw new Error(`Invalid fixture stock for product "${product.name}".`);
    }

    const concentration = concentrationForProduct(product.name);
    if (!allowedConcentrations.includes(concentration)) {
      throw new Error(`Unsupported fixture concentration for product "${product.name}".`);
    }

    const sellingPrice = priceToXof(product.price);
    const costPriceXof = roundDownToNearest500(sellingPrice * 0.6);
    const variants = product.sizes.map((size, index) => {
      const sizeMl = parseSizeMl(size);
      const override = stockOverride(product.name, sizeMl, product.stock);
      const compareAtPriceXof =
        featuredProductNames.includes(product.name as (typeof featuredProductNames)[number]) && index === 0
          ? sellingPrice + 15_000
          : null;
      return {
        sku: generateSku({ productName: product.name, sizeMl, concentration }),
        sizeMl,
        priceXof: sellingPrice,
        compareAtPriceXof,
        costPriceXof,
        ...override,
        concentration,
      };
    });

    return {
      source: product,
      slug: productSlug(product.name),
      categorySlug: category.slug,
      brandSlug: brandSlug(product.brand),
      concentration,
      publicTarget: publicTargetForCategory(product.category),
      fragranceFamily: fragranceFamilyForProduct(product),
      featured: featuredProductNames.includes(product.name as (typeof featuredProductNames)[number]),
      activeIntended: activeIntendedProductNames.includes(product.name),
      variants,
    };
  });

  assertUnique(normalized.map((product) => product.slug), "product slug");
  assertUnique(normalized.flatMap((product) => product.variants.map((variant) => variant.sku)), "variant SKU");

  for (const product of normalized) {
    for (const variant of product.variants) {
      if (!Number.isInteger(variant.sizeMl) || variant.sizeMl <= 0) throw new Error(`Invalid fixture size for SKU ${variant.sku}.`);
      if (!Number.isInteger(variant.priceXof) || variant.priceXof <= 0) throw new Error(`Invalid fixture selling price for SKU ${variant.sku}.`);
      if (!Number.isInteger(variant.stockOnHand) || variant.stockOnHand < 0) throw new Error(`Invalid stock_on_hand for SKU ${variant.sku}.`);
      if (!Number.isInteger(variant.reservedQuantity) || variant.reservedQuantity < 0 || variant.reservedQuantity > variant.stockOnHand) {
        throw new Error(`Invalid reserved_quantity for SKU ${variant.sku}.`);
      }
    }
  }

  return normalized;
}

export function buildPhase65Brands(): BrandRow[] {
  return brands.map((brand, index) => ({
    name: brand.name,
    slug: brandSlug(brand.name),
    description: PHASE65_MANUAL_DESCRIPTION,
    active: true,
    sort_order: index + 1,
  }));
}

export function buildPhase65Categories(): CategoryRow[] {
  return categories.map((category, index) => ({
    name: categoryDisplayNames[category.name],
    slug: category.slug,
    description: PHASE65_MANUAL_DESCRIPTION,
    active: true,
    sort_order: index + 1,
  }));
}

export function buildPhase65ProductRows(
  brandIds: Map<string, string>,
  categoryIds: Map<string, string>,
  existingStatuses: Map<string, Database["public"]["Enums"]["product_status"]> = new Map(),
): ProductRow[] {
  return normalizePhase65Products().map((product) => {
    const brandId = brandIds.get(product.brandSlug);
    const categoryId = categoryIds.get(product.categorySlug);
    if (!brandId) throw new Error(`Missing seeded brand relation for product "${product.source.name}".`);
    if (!categoryId) throw new Error(`Missing seeded category relation for product "${product.source.name}".`);
    const existingStatus = existingStatuses.get(product.slug);
    return {
      brand_id: brandId,
      category_id: categoryId,
      name: product.source.name,
      slug: product.slug,
      short_description: `${PHASE65_MANUAL_PREFIX} ${product.source.description}`,
      description: product.source.description,
      fragrance_family: product.fragranceFamily,
      top_notes: [],
      heart_notes: [],
      base_notes: [],
      gender_category: product.publicTarget,
      status: existingStatus === "ACTIVE" ? "ACTIVE" : "DRAFT",
      featured: product.featured,
      seo_title: product.source.name,
      seo_description: `${product.source.description} (${PHASE65_MANUAL_PREFIX})`,
    };
  });
}

export function buildPhase65VariantRows(productIds: Map<string, string>): VariantRow[] {
  return normalizePhase65Products().flatMap((product) => {
    const productId = productIds.get(product.slug);
    if (!productId) throw new Error(`Missing seeded product relation for slug "${product.slug}".`);
    return product.variants.map((variant) => ({
      product_id: productId,
      sku: variant.sku,
      size_ml: variant.sizeMl,
      concentration: variant.concentration,
      price_xof: variant.priceXof,
      compare_at_price_xof: variant.compareAtPriceXof,
      cost_price_xof: variant.costPriceXof,
      stock_on_hand: variant.stockOnHand,
      reserved_quantity: variant.reservedQuantity,
      low_stock_threshold: variant.lowStockThreshold,
      active: variant.active,
    }));
  });
}

export function buildPhase65SpecialProductRows(
  brandId: string,
  categoryId: string,
  existingStatuses: Map<string, Database["public"]["Enums"]["product_status"]> = new Map(),
): ProductRow[] {
  const special = [
    {
      name: `Produit sans variante ${PHASE65_MANUAL_PREFIX}`,
      slug: `produit-sans-variante-${PHASE65_MANUAL_SLUG_SUFFIX}`,
      description: "Produit de test sans variante pour valider le libellé Stock non configuré.",
    },
    {
      name: `Produit variantes inactives ${PHASE65_MANUAL_PREFIX}`,
      slug: `produit-variantes-inactives-${PHASE65_MANUAL_SLUG_SUFFIX}`,
      description: "Produit de test avec variantes inactives pour valider le libellé Aucune variante active.",
    },
  ];

  return special.map((product) => ({
    brand_id: brandId,
    category_id: categoryId,
    name: product.name,
    slug: product.slug,
    short_description: PHASE65_MANUAL_DESCRIPTION,
    description: product.description,
    fragrance_family: "Aromatique",
    top_notes: [],
    heart_notes: [],
    base_notes: [],
    gender_category: "UNISEXE",
    status: existingStatuses.get(product.slug) === "ACTIVE" ? "ACTIVE" : "DRAFT",
    featured: false,
    seo_title: product.name,
    seo_description: `${product.description} (${PHASE65_MANUAL_PREFIX})`,
  }));
}

export function buildPhase65SpecialVariantRows(productIds: Map<string, string>): VariantRow[] {
  const inactiveOnlyProductId = productIds.get(`produit-variantes-inactives-${PHASE65_MANUAL_SLUG_SUFFIX}`);
  if (!inactiveOnlyProductId) throw new Error("Missing seeded special product relation for inactive variants.");
  return [
    {
      product_id: inactiveOnlyProductId,
      sku: `INACTIVE-50-EDP-${PHASE65_MANUAL_SKU_SUFFIX}`,
      size_ml: 50,
      concentration: "EDP",
      price_xof: 25_000,
      compare_at_price_xof: null,
      cost_price_xof: 15_000,
      stock_on_hand: 10,
      reserved_quantity: 0,
      low_stock_threshold: 5,
      active: false,
    },
  ];
}

export function buildPhase65ContentRows(): StoreContentInsert[] {
  const about = aboutContentSchema.parse({
    pageTitle: "À propos de notre boutique",
    introText: "Nous sélectionnons des parfums pour femme, homme et unisexes adaptés à différents styles et budgets.",
    brandStory: "Notre catalogue réunit des maisons de parfumerie internationales et des références appréciées en Côte d’Ivoire.",
    mission: "Aider chaque client à choisir un parfum adapté à ses goûts, à son occasion et à son budget.",
    values: ["Conseil", "Transparence", "Qualité de service"],
    imageUrl: "",
    seoTitle: `À propos test ${PHASE65_MANUAL_PREFIX}`,
    seoDescription: PHASE65_MANUAL_DESCRIPTION,
  });
  const contact = contactContentSchema.parse({
    pageTitle: "Nous contacter",
    introText: "Contactez notre équipe pour vérifier une disponibilité ou obtenir un conseil parfum.",
    telephone: "+225 07 00 00 00 00",
    whatsappNumber: "2250700000000",
    email: "contact-test@example.com",
    address: "Cocody, Abidjan - adresse de démonstration",
    openingHours: [{ label: "Horaires", value: "Lundi au samedi, de 9 h à 18 h" }],
    mapUrl: "",
    whatsappCtaLabel: "Écrire sur WhatsApp",
    emailCtaLabel: "Envoyer un e-mail",
    phoneCtaLabel: "Appeler",
    seoTitle: `Contact test ${PHASE65_MANUAL_PREFIX}`,
    seoDescription: PHASE65_MANUAL_DESCRIPTION,
  });
  const delivery = deliveryContentSchema.parse({
    pageTitle: "Livraison et paiement",
    introText: "Les délais et frais sont confirmés avant validation de chaque commande.",
    zones: ["Cocody", "Plateau", "Marcory", "Treichville", "Yopougon"].map((name) => ({
      name,
      fee: "À confirmer",
      timeframe: name === "Cocody" ? "24 à 48 heures selon disponibilité" : "Délai confirmé avec le client",
      description: "",
    })),
    freeDeliveryConditions: "",
    pickupInformation: "",
    mobileMoneyDescription: "Mobile Money après confirmation",
    cashOnDeliveryConditions: "Paiement à la livraison selon la zone et les conditions convenues",
    orderConfirmationProcess:
      "1. Choisir les parfums et variantes.\n2. Envoyer le panier via WhatsApp.\n3. Confirmer disponibilité, livraison et paiement.\n4. Recevoir la confirmation de l’équipe.",
    faq: [
      { question: "Comment connaître les frais de livraison ?", answer: "Ils sont confirmés avec le client avant validation." },
      { question: "Puis-je payer à la livraison ?", answer: "Oui, selon la zone et les conditions convenues." },
      { question: "Comment confirmer la disponibilité d’un parfum ?", answer: "Envoyez le panier via WhatsApp pour validation manuelle." },
    ],
    seoTitle: `Livraison test ${PHASE65_MANUAL_PREFIX}`,
    seoDescription: PHASE65_MANUAL_DESCRIPTION,
  });
  const social = socialContentSchema.parse({
    instagramUrl: "",
    facebookUrl: "",
    tiktokUrl: "",
    whatsappNumber: "2250700000000",
    socialCtaCopy: "Liens sociaux de test à remplacer avant production.",
  });

  return [
    { page_key: "about", content: about as Json, public_readable: true },
    { page_key: "contact", content: contact as Json, public_readable: true },
    { page_key: "delivery", content: delivery as Json, public_readable: true },
    { page_key: "social", content: social as Json, public_readable: true },
  ];
}

export function getPhase65CleanupScope() {
  return {
    prefix: PHASE65_MANUAL_PREFIX,
    productSlugSuffix: PHASE65_MANUAL_SLUG_SUFFIX,
    productSlugPattern: `%-${PHASE65_MANUAL_SLUG_SUFFIX}`,
    skuPattern: `%-${PHASE65_MANUAL_SKU_SUFFIX}`,
    specialNamePattern: `%${PHASE65_MANUAL_PREFIX}%`,
    fixtureDescription: PHASE65_MANUAL_DESCRIPTION,
    contentSeoPattern: `%${PHASE65_MANUAL_PREFIX}%`,
  };
}

export function assertCanRunPhase65ManualSeed(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("Phase 6.5 manual seed refuses to run in production.");
  }
  if (env.ALLOW_PHASE65_MANUAL_SEED !== "true") {
    throw new Error("Set ALLOW_PHASE65_MANUAL_SEED=true to run the Phase 6.5 manual seed.");
  }
}

export function assertCanRunPhase65ManualCleanup(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("Phase 6.5 manual cleanup refuses to run in production.");
  }
  if (env.ALLOW_PHASE65_MANUAL_CLEANUP !== "true") {
    throw new Error("Set ALLOW_PHASE65_MANUAL_CLEANUP=true to run the Phase 6.5 manual cleanup.");
  }
}
