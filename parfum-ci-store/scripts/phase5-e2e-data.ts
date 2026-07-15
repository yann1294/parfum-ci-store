import type { Database } from "../src/types/database.types.ts";

export const PHASE5_E2E_PREFIX = "E2E-20260716-A";
export const PHASE5_E2E_SLUG_PREFIX = "e2e-20260716-a";

export type Phase5ProductStatus = Database["public"]["Enums"]["product_status"];
export type Phase5ProductSeed = {
  key: string;
  name: string;
  slug: string;
  status: Phase5ProductStatus;
  desiredActive: boolean;
  brandIndex: number;
  categoryIndex: number;
  description: string;
};

export type Phase5VariantSeed = {
  sku: string;
  productKey: string;
  sizeMl: number;
  concentration: "EDP" | "EDT" | "extrait";
  priceXof: number;
  compareAtPriceXof: number | null;
  costPriceXof: number;
  stockOnHand: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  active: boolean;
};

export function assertCanRunPhase5E2eScript(env: NodeJS.ProcessEnv) {
  if (env.NODE_ENV === "production" || env.VERCEL_ENV === "production") {
    throw new Error("Phase 5 E2E seed scripts refuse to run in production.");
  }

  if (env.ALLOW_E2E_SEED !== "true") {
    throw new Error("Set ALLOW_E2E_SEED=true to run Phase 5 E2E seed scripts.");
  }
}

export function assertPhase5Prefix(value: string) {
  if (!value.includes(PHASE5_E2E_PREFIX)) {
    throw new Error(`Refusing to operate on non-E2E value: missing ${PHASE5_E2E_PREFIX}.`);
  }
}

export function phase5Slug(index: number, kind: string) {
  return `${PHASE5_E2E_SLUG_PREFIX}-${kind}-${String(index).padStart(2, "0")}`;
}

export function buildPhase5Brands(): Array<Database["public"]["Tables"]["brands"]["Insert"]> {
  return Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const name = `${PHASE5_E2E_PREFIX} Marque ${String(number).padStart(2, "0")}`;
    assertPhase5Prefix(name);

    return {
      name,
      slug: phase5Slug(number, "brand"),
      description: `Marque fictive ${number} pour tests E2E Phase 5.`,
      active: number % 7 !== 0,
      sort_order: number,
    };
  });
}

export function buildPhase5Categories(): Array<Database["public"]["Tables"]["categories"]["Insert"]> {
  return Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const name = `${PHASE5_E2E_PREFIX} Catégorie ${String(number).padStart(2, "0")}`;
    assertPhase5Prefix(name);

    return {
      name,
      slug: phase5Slug(number, "category"),
      description: `Catégorie fictive ${number} pour tests E2E Phase 5.`,
      active: number % 8 !== 0,
      sort_order: number,
    };
  });
}

export function buildPhase5Products(): Phase5ProductSeed[] {
  const products = [
    {
      key: "primary-draft",
      name: `${PHASE5_E2E_PREFIX} Produit principal brouillon`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-primary-draft`,
      status: "DRAFT",
      desiredActive: false,
      brandIndex: 1,
      categoryIndex: 1,
      description: "Produit brouillon principal pour la validation E2E du catalogue admin.",
    },
    {
      key: "active-ready-1",
      name: `${PHASE5_E2E_PREFIX} Produit actif image manuelle 1`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-active-ready-1`,
      status: "ACTIVE",
      desiredActive: true,
      brandIndex: 2,
      categoryIndex: 2,
      description: "Produit destiné au statut ACTIVE après upload signé d'une image réelle.",
    },
    {
      key: "active-ready-2",
      name: `${PHASE5_E2E_PREFIX} Produit actif image manuelle 2`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-active-ready-2`,
      status: "ACTIVE",
      desiredActive: true,
      brandIndex: 3,
      categoryIndex: 3,
      description: "Second produit destiné au statut ACTIVE après finalisation d'image réelle.",
    },
    {
      key: "draft-2",
      name: `${PHASE5_E2E_PREFIX} Produit brouillon secondaire`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-draft-2`,
      status: "DRAFT",
      desiredActive: false,
      brandIndex: 4,
      categoryIndex: 4,
      description: "Produit brouillon secondaire pour filtres et pagination.",
    },
    {
      key: "archived-1",
      name: `${PHASE5_E2E_PREFIX} Produit archivé 1`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-archived-1`,
      status: "ARCHIVED",
      desiredActive: false,
      brandIndex: 5,
      categoryIndex: 5,
      description: "Produit archivé pour validation de filtre statut.",
    },
    {
      key: "archived-2",
      name: `${PHASE5_E2E_PREFIX} Produit archivé 2`,
      slug: `${PHASE5_E2E_SLUG_PREFIX}-archived-2`,
      status: "ARCHIVED",
      desiredActive: false,
      brandIndex: 6,
      categoryIndex: 6,
      description: "Second produit archivé pour validation de filtre statut.",
    },
  ] satisfies Phase5ProductSeed[];

  return products.map((product) => {
    assertPhase5Prefix(product.name);
    return product;
  });
}

export function buildPhase5Variants(): Phase5VariantSeed[] {
  const productKeys = buildPhase5Products().map((product) => product.key);
  const concentrations: Phase5VariantSeed["concentration"][] = ["EDP", "EDT", "extrait"];

  return Array.from({ length: 25 }, (_, index) => {
    const number = index + 1;
    const stockScenario = number % 3;
    const stockOnHand = stockScenario === 0 ? 0 : stockScenario === 1 ? 4 : 12;
    const reservedQuantity = stockScenario === 0 ? 0 : stockScenario === 1 ? 3 : 2;
    const lowStockThreshold = stockScenario === 1 ? 2 : 3;

    return {
      sku: `${PHASE5_E2E_PREFIX}-SKU-${String(number).padStart(2, "0")}`,
      productKey: productKeys[index % productKeys.length],
      sizeMl: [30, 50, 75, 100][index % 4],
      concentration: concentrations[index % concentrations.length],
      priceXof: 18000 + number * 1000,
      compareAtPriceXof: number % 4 === 0 ? 24000 + number * 1000 : null,
      costPriceXof: 9000 + number * 400,
      stockOnHand,
      reservedQuantity,
      lowStockThreshold,
      active: number % 5 !== 0,
    };
  }).map((variant) => {
    assertPhase5Prefix(variant.sku);
    return variant;
  });
}

export function getPhase5CleanupScope() {
  return {
    prefix: PHASE5_E2E_PREFIX,
    namePattern: `${PHASE5_E2E_PREFIX}%`,
    skuPattern: `${PHASE5_E2E_PREFIX}-%`,
    slugPattern: `${PHASE5_E2E_SLUG_PREFIX}-%`,
  };
}
