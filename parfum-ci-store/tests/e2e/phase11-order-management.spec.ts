import { expect, test, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

type RoleName = "OWNER" | "ADMIN" | "ORDER_MANAGER" | "CUSTOMER_SUPPORT" | "INVENTORY_MANAGER";

type StaffActor = {
  id: string;
  email: string;
  password: string;
  role: RoleName;
};

type VariantState = {
  variantId: string;
  stockOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
};

type StoreSettingsSnapshot = {
  enabledDeliveryMethods: string[];
  enabledPaymentMethods: string[];
  paymentMethodConfigs: Record<string, unknown>;
  defaultDeliveryFeeXof: number | null;
};

type OrderFixture = {
  orderId: string;
  orderNumber: string;
  productId: string;
  variantId: string;
  initialStockOnHand: number;
  initialReservedQuantity: number;
  initialAvailableQuantity: number;
  quantity: number;
  deliveryMethod: "HOME_DELIVERY" | "PICKUP";
  paymentMethod: "CASH_ON_DELIVERY" | "ORANGE_MONEY";
};

type TransitionResult = {
  orderId: string;
  orderNumber: string;
  fromStatus: string;
  toStatus: string;
  stockEffect: "NONE" | "RELEASED" | "SOLD";
  idempotent: boolean;
};

const prefix = `E2E-P11-${Date.now()}`;
const createdProductIds: string[] = [];
const createdVariantIds: string[] = [];
const createdOrderIds: string[] = [];
const createdNotificationIds: string[] = [];
let phoneCounter = 10000000;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Phase 11 E2E verification.`);
  return value;
}

function assertNonProductionEnv() {
  const url = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  requiredEnv("SUPABASE_SECRET_KEY");
  if (url.includes("example.supabase.co")) {
    throw new Error("Phase 11 E2E refused to run against example.supabase.co.");
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("Phase 11 E2E refused to run in production.");
  }
}

function adminClient() {
  assertNonProductionEnv();
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SECRET_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as SupabaseClient;
}

function publicClient() {
  assertNonProductionEnv();
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  ) as SupabaseClient;
}

async function actorFromEnv(role: RoleName): Promise<StaffActor> {
  const email =
    process.env[`PLAYWRIGHT_${role}_EMAIL`] ??
    (role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_EMAIL : undefined) ??
    (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_EMAIL : undefined);
  const password =
    process.env[`PLAYWRIGHT_${role}_PASSWORD`] ??
    (role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_PASSWORD : undefined) ??
    (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_PASSWORD : undefined);
  if (!email || !password) throw new Error(`${role} Playwright credentials are required.`);

  const supabase = publicClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`${role} test actor could not authenticate.`);
  return { id: data.user.id, email, password, role };
}

function hasActorEnv(role: RoleName) {
  return (
    Boolean(
      process.env[`PLAYWRIGHT_${role}_EMAIL`] ??
      (role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_EMAIL : undefined) ??
      (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_EMAIL : undefined),
    ) &&
    Boolean(
      process.env[`PLAYWRIGHT_${role}_PASSWORD`] ??
      (role === "CUSTOMER_SUPPORT" ? process.env.PLAYWRIGHT_SUPPORT_PASSWORD : undefined) ??
      (role === "OWNER" ? process.env.PLAYWRIGHT_ADMIN_PASSWORD : undefined),
    )
  );
}

function hashMaterial(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function orderFingerprint(input: {
  customer: {
    fullName: string;
    phone: string;
    email?: string;
    whatsapp?: string;
    city: string;
    commune: string;
    address?: string;
    landmark?: string;
    deliveryInstructions?: string;
    customerNote?: string;
  };
  deliveryMethod: string;
  paymentMethod: string;
  lines: Array<{ productId: string; variantId: string; quantity: number }>;
}) {
  return hashMaterial({
    customer: {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email ?? null,
      whatsapp: input.customer.whatsapp ?? null,
      city: input.customer.city,
      commune: input.customer.commune,
      address: input.customer.address ?? null,
      landmark: input.customer.landmark ?? null,
      deliveryInstructions: input.customer.deliveryInstructions ?? null,
      customerNote: input.customer.customerNote ?? null,
    },
    deliveryMethod: input.deliveryMethod,
    paymentMethod: input.paymentMethod,
    lines: input.lines,
  });
}

function transitionFingerprint(input: {
  actorId: string;
  orderId: string;
  expectedStatus?: string;
  targetStatus: string;
  reason?: string;
  note?: string;
}) {
  return hashMaterial({
    actorId: input.actorId,
    orderId: input.orderId,
    expectedStatus: input.expectedStatus ?? null,
    targetStatus: input.targetStatus,
    reason: input.reason?.trim() ?? null,
    note: input.note?.trim() ?? null,
  });
}

function paymentFingerprint(input: {
  actorId: string;
  orderId: string;
  targetPaymentStatus: string;
  reference?: string;
  reason?: string;
}) {
  return hashMaterial({
    actorId: input.actorId,
    orderId: input.orderId,
    targetPaymentStatus: input.targetPaymentStatus,
    reference: input.reference?.trim() ?? null,
    reason: input.reason?.trim() ?? null,
  });
}

function inventoryFingerprint(input: {
  actorId: string;
  variantId: string;
  operationType: string;
  quantity: number;
  adjustmentDirection?: string;
  reason?: string;
  reference?: string;
}) {
  return hashMaterial({
    actorId: input.actorId,
    variantId: input.variantId,
    operationType: input.operationType,
    quantity: input.quantity,
    adjustmentDirection: input.adjustmentDirection ?? null,
    reason: input.reason?.trim() ?? null,
    reference: input.reference?.trim() ?? null,
  });
}

async function ensurePhase11Migration(supabase: SupabaseClient) {
  const { error: transitionError } = await supabase.rpc(
    "transition_order_server" as never,
    {
      request: {
        orderId: randomUUID(),
        targetStatus: "CONFIRMED",
        actorId: randomUUID(),
        idempotencyKey: `phase11-probe-${randomUUID()}-${randomUUID()}`,
        requestFingerprint: "0".repeat(64),
      },
    } as never,
  );

  if (transitionError?.code === "PGRST202" || transitionError?.code === "42883") {
    throw new Error(
      "Phase 11 migration is not applied: transition_order_server(jsonb) is unavailable.",
    );
  }
}

async function createCatalogueFixture(supabase: SupabaseClient, stockOnHand: number) {
  const suffix = randomUUID().slice(0, 8);
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .insert({
      name: `${prefix} Brand ${suffix}`,
      slug: `${prefix.toLowerCase()}-brand-${suffix}`,
      active: true,
    })
    .select("id")
    .single();
  if (brandError || !brand) throw new Error("Failed to create Phase 11 brand fixture.");

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .insert({
      name: `${prefix} Catégorie ${suffix}`,
      slug: `${prefix.toLowerCase()}-categorie-${suffix}`,
      active: true,
    })
    .select("id")
    .single();
  if (categoryError || !category) throw new Error("Failed to create Phase 11 category fixture.");

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      name: `${prefix} Parfum ${suffix}`,
      slug: `${prefix.toLowerCase()}-parfum-${suffix}`,
      description: "Fixture Phase 11 avec image et variante active.",
      short_description: "Fixture Phase 11",
      brand_id: brand.id,
      category_id: category.id,
      status: "DRAFT",
    })
    .select("id")
    .single();
  if (productError || !product) throw new Error("Failed to create Phase 11 product fixture.");
  createdProductIds.push(product.id);

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: product.id,
      sku: `${prefix}-SKU-${suffix}`,
      size_ml: 100,
      concentration: "EDP",
      price_xof: 50000,
      stock_on_hand: stockOnHand,
      reserved_quantity: 0,
      low_stock_threshold: 2,
      active: true,
      inventory_initialized_at: new Date().toISOString(),
    })
    .select("id, stock_on_hand, reserved_quantity")
    .single();
  if (variantError || !variant) throw new Error("Failed to create Phase 11 variant fixture.");
  createdVariantIds.push(variant.id);

  const imageObjectId = randomUUID();
  const { error: imageError } = await supabase.from("product_images").insert({
    product_id: product.id,
    bucket_id: "product-images",
    object_path: `products/${product.id}/${imageObjectId}.jpg`,
    alt_text: `${prefix} image`,
    approved: true,
    active: true,
    is_primary: true,
    mime_type: "image/jpeg",
    byte_size: 1024,
    width: 800,
    height: 800,
  });
  if (imageError) throw new Error("Failed to create Phase 11 product image fixture.");

  const { error: activeError } = await supabase
    .from("products")
    .update({ status: "ACTIVE" })
    .eq("id", product.id);
  if (activeError) throw new Error("Failed to activate Phase 11 product fixture.");

  return {
    productId: product.id,
    variantId: variant.id,
    initialStockOnHand: variant.stock_on_hand,
    initialReservedQuantity: variant.reserved_quantity,
    initialAvailableQuantity: variant.stock_on_hand - variant.reserved_quantity,
  };
}

async function createOrderFixture(
  supabase: SupabaseClient,
  options: {
    deliveryMethod?: "HOME_DELIVERY" | "PICKUP";
    paymentMethod?: "CASH_ON_DELIVERY" | "ORANGE_MONEY";
    quantity?: number;
    stockOnHand?: number;
    phoneSuffix?: string;
  } = {},
): Promise<OrderFixture> {
  const catalogue = await createCatalogueFixture(supabase, options.stockOnHand ?? 20);
  const deliveryMethod = options.deliveryMethod ?? "HOME_DELIVERY";
  const paymentMethod = options.paymentMethod ?? "CASH_ON_DELIVERY";
  const quantity = options.quantity ?? 1;
  const phone = options.phoneSuffix
    ? `+22507${options.phoneSuffix.padStart(8, "0").slice(0, 8)}`
    : `+22507${String(phoneCounter++).padStart(8, "0")}`;
  const payload = {
    idempotencyKey: `phase11-order-${randomUUID()}-${randomUUID()}`,
    customer: {
      fullName: `${prefix} Client ${randomUUID().slice(0, 6)}`,
      phone,
      city: "Abidjan",
      commune: "Cocody",
      email: `${randomUUID().slice(0, 8)}@example.test`,
      whatsapp: phone,
      address: "Adresse test Phase 11",
      landmark: "Repère test",
      deliveryInstructions: "Instructions test",
      customerNote: "Note client test",
    },
    deliveryMethod,
    paymentMethod,
    lines: [{ productId: catalogue.productId, variantId: catalogue.variantId, quantity }],
  };
  const request = { ...payload, requestFingerprint: orderFingerprint(payload) };
  const { data, error } = await supabase.rpc(
    "create_guest_order_server" as never,
    { request } as never,
  );
  if (error || !data) {
    throw new Error(
      `Failed to create Phase 11 order fixture: ${error?.code ?? "unknown"} ${error?.message ?? ""}`.trim(),
    );
  }
  const confirmation = data as unknown as { orderId: string; orderNumber: string };
  createdOrderIds.push(confirmation.orderId);
  return {
    orderId: confirmation.orderId,
    orderNumber: confirmation.orderNumber,
    productId: catalogue.productId,
    variantId: catalogue.variantId,
    initialStockOnHand: catalogue.initialStockOnHand,
    initialReservedQuantity: catalogue.initialReservedQuantity,
    initialAvailableQuantity: catalogue.initialAvailableQuantity,
    quantity,
    deliveryMethod,
    paymentMethod,
  };
}

async function transitionOrder(
  supabase: SupabaseClient,
  actor: StaffActor,
  orderId: string,
  targetStatus: string,
  reason?: string,
  expectedStatus?: string,
) {
  const payload = {
    orderId,
    expectedStatus,
    targetStatus,
    reason,
    idempotencyKey: `phase11-transition-${randomUUID()}-${randomUUID()}`,
    actorId: actor.id,
  };
  const request = { ...payload, requestFingerprint: transitionFingerprint(payload) };
  const { data, error } = await supabase.rpc(
    "transition_order_server" as never,
    { request } as never,
  );
  return { data: data as TransitionResult | null, error };
}

async function transitionWithKey(
  supabase: SupabaseClient,
  actor: StaffActor,
  orderId: string,
  targetStatus: string,
  idempotencyKey: string,
  reason?: string,
  expectedStatus?: string,
) {
  const payload = {
    orderId,
    expectedStatus,
    targetStatus,
    reason,
    idempotencyKey,
    actorId: actor.id,
  };
  const request = { ...payload, requestFingerprint: transitionFingerprint(payload) };
  const { data, error } = await supabase.rpc(
    "transition_order_server" as never,
    { request } as never,
  );
  return { data: data as TransitionResult | null, error };
}

async function updatePaymentWithKey(
  supabase: SupabaseClient,
  actor: StaffActor,
  orderId: string,
  idempotencyKey: string,
) {
  const payload = {
    orderId,
    targetPaymentStatus: "PAID",
    reference: `REF-${idempotencyKey.slice(-8)}`,
    reason: "Paiement vérifié E2E",
    idempotencyKey,
    actorId: actor.id,
  };
  const request = { ...payload, requestFingerprint: paymentFingerprint(payload) };
  const { data, error } = await supabase.rpc(
    "record_order_payment_server" as never,
    { request } as never,
  );
  return { data, error };
}

async function adjustInventoryDecrease(
  supabase: SupabaseClient,
  actor: StaffActor,
  variantId: string,
  quantity: number,
) {
  const payload = {
    variantId,
    operationType: "ADJUSTMENT",
    quantity,
    adjustmentDirection: "DECREASE",
    reason: "Course Phase 11 livraison",
    idempotencyKey: `phase11-inventory-${randomUUID()}-${randomUUID()}`,
    actorId: actor.id,
  };
  const request = { ...payload, requestFingerprint: inventoryFingerprint(payload) };
  return supabase.rpc("adjust_inventory_server" as never, { request } as never);
}

async function variantState(supabase: SupabaseClient, variantId: string): Promise<VariantState> {
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, stock_on_hand, reserved_quantity")
    .eq("id", variantId)
    .single();
  if (error || !data) throw new Error("Failed to read variant state.");
  return {
    variantId: data.id,
    stockOnHand: data.stock_on_hand,
    reservedQuantity: data.reserved_quantity,
    availableQuantity: data.stock_on_hand - data.reserved_quantity,
  };
}

async function ledgerCount(
  supabase: SupabaseClient,
  orderId: string,
  type: "RESERVED" | "RELEASED" | "SOLD" | "RETURNED",
) {
  const { count, error } = await supabase
    .from("inventory_transactions")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("type", type);
  if (error) throw new Error(`Failed to count ${type} ledger rows.`);
  return count ?? 0;
}

async function historyCount(supabase: SupabaseClient, orderId: string, status: string) {
  const { count, error } = await supabase
    .from("order_status_history")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("to_status", status);
  if (error) throw new Error(`Failed to count ${status} history rows.`);
  return count ?? 0;
}

async function auditCount(supabase: SupabaseClient, orderId: string, action: string) {
  const { count, error } = await supabase
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("resource_type", "order")
    .eq("resource_id", orderId)
    .eq("action", action);
  if (error) throw new Error(`Failed to count ${action} audit rows.`);
  return count ?? 0;
}

async function login(page: Page, actor: StaffActor) {
  await page.goto("/connexion?retour=%2Fadmin");
  await page.getByLabel("Adresse email").fill(actor.email);
  await page.getByLabel("Mot de passe").fill(actor.password);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page.waitForURL("**/admin");
}

async function cleanup(supabase: SupabaseClient) {
  if (createdNotificationIds.length > 0) {
    await supabase
      .from("notification_attempts")
      .delete()
      .in("notification_id", createdNotificationIds);
    await supabase.from("notifications").delete().in("id", createdNotificationIds);
  }
  if (createdOrderIds.length > 0) {
    await supabase
      .from("order_internal_notes" as never)
      .delete()
      .in("order_id", createdOrderIds as never);
    await supabase.from("payment_transactions").delete().in("order_id", createdOrderIds);
    await supabase.from("order_status_history").delete().in("order_id", createdOrderIds);
    for (const orderId of createdOrderIds) {
      await supabase.from("notifications").delete().eq("payload->>order_id", orderId);
    }
    await supabase
      .from("audit_logs")
      .delete()
      .eq("resource_type", "order")
      .in("resource_id", createdOrderIds);
    await supabase.from("inventory_transactions").delete().in("order_id", createdOrderIds);
    await supabase.from("orders").delete().in("id", createdOrderIds);
    await supabase.from("customers").delete().like("full_name", `${prefix}%`);
  }
  if (createdVariantIds.length > 0) {
    await supabase.from("inventory_transactions").delete().in("variant_id", createdVariantIds);
    await supabase.from("product_variants").delete().in("id", createdVariantIds);
  }
  if (createdProductIds.length > 0) {
    await supabase.from("product_images").delete().in("product_id", createdProductIds);
    await supabase.from("products").delete().in("id", createdProductIds);
  }
  await supabase.from("brands").delete().like("name", `${prefix}%`);
  await supabase.from("categories").delete().like("name", `${prefix}%`);
}

test.describe.configure({ mode: "serial" });

test.describe("Phase 11 order management real database verification", () => {
  let supabase: SupabaseClient;
  let owner: StaffActor;
  let orderManager: StaffActor;
  let originalStoreSettings: StoreSettingsSnapshot | null = null;

  test.beforeAll(async () => {
    supabase = adminClient();
    await ensurePhase11Migration(supabase);
    owner = await actorFromEnv("OWNER");
    orderManager = await actorFromEnv("ORDER_MANAGER");
    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select(
        "enabled_delivery_methods, enabled_payment_methods, payment_method_configs, default_delivery_fee_xof",
      )
      .eq("id", true)
      .single();
    if (settingsError || !settings)
      throw new Error("Failed to snapshot store settings for Phase 11 E2E.");
    originalStoreSettings = {
      enabledDeliveryMethods: settings.enabled_delivery_methods,
      enabledPaymentMethods: settings.enabled_payment_methods,
      paymentMethodConfigs: settings.payment_method_configs as Record<string, unknown>,
      defaultDeliveryFeeXof: settings.default_delivery_fee_xof,
    };
    await supabase
      .from("store_settings")
      .update({
        enabled_delivery_methods: ["HOME_DELIVERY", "PICKUP"],
        enabled_payment_methods: ["CASH_ON_DELIVERY", "ORANGE_MONEY"],
        default_delivery_fee_xof: 0,
        payment_method_configs: {
          CASH_ON_DELIVERY: { enabled: true, label: "Paiement à la livraison", displayOrder: 1 },
          ORANGE_MONEY: {
            enabled: true,
            label: "Orange Money",
            merchantNumber: "+2250700000000",
            instructions: "Instruction E2E",
            displayOrder: 2,
          },
        },
      })
      .eq("id", true);
  });

  test.afterAll(async () => {
    if (!supabase) return;
    try {
      await cleanup(supabase);
    } finally {
      if (originalStoreSettings) {
        await supabase
          .from("store_settings")
          .update({
            enabled_delivery_methods: originalStoreSettings.enabledDeliveryMethods,
            enabled_payment_methods: originalStoreSettings.enabledPaymentMethods,
            payment_method_configs: originalStoreSettings.paymentMethodConfigs,
            default_delivery_fee_xof: originalStoreSettings.defaultDeliveryFeeXof,
          })
          .eq("id", true);
      }
    }
  });

  test("browser order list, filters, detail snapshots and responsive layouts", async ({ page }) => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 12, quantity: 1 });
    await login(page, owner);

    await page.goto(
      `/admin/commandes?q=${encodeURIComponent(fixture.orderNumber)}&status=PENDING_CONFIRMATION`,
    );
    await expect(page.getByRole("heading", { name: "Commandes" })).toBeVisible();
    await expect(page.getByText(fixture.orderNumber).first()).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "En attente de confirmation" }).first(),
    ).toBeVisible();

    await page.getByRole("link", { name: "Ouvrir" }).first().click();
    await expect(page.getByRole("heading", { name: fixture.orderNumber })).toBeVisible();
    await expect(page.getByText("Snapshot client")).toBeVisible();
    await expect(page.getByText("Articles")).toBeVisible();
    await expect(page.getByText("Timeline commande")).toBeVisible();

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 820, height: 900 },
      { width: 640, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByText(fixture.orderNumber).first()).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow, `${viewport.width}x${viewport.height} should not create body overflow`).toBe(
        false,
      );
    }
  });

  test("two simultaneous orders competing for the final unit reserve exactly once", async () => {
    const catalogue = await createCatalogueFixture(supabase, 1);
    const makeRequest = (suffix: string) => {
      const payload = {
        idempotencyKey: `phase16-final-unit-${suffix}-${randomUUID()}-${randomUUID()}`,
        customer: {
          fullName: `${prefix} Final Unit ${suffix}`,
          phone: `+22507000016${suffix.padStart(2, "0")}`,
          city: "Abidjan",
          commune: "Cocody",
        },
        deliveryMethod: "HOME_DELIVERY",
        paymentMethod: "CASH_ON_DELIVERY",
        lines: [{ productId: catalogue.productId, variantId: catalogue.variantId, quantity: 1 }],
      };
      return { ...payload, requestFingerprint: orderFingerprint(payload) };
    };

    const [first, second] = await Promise.all([
      supabase.rpc("create_guest_order_server" as never, { request: makeRequest("01") } as never),
      supabase.rpc("create_guest_order_server" as never, { request: makeRequest("02") } as never),
    ]);
    const results = [first, second];
    const successes = results.filter((result) => !result.error && result.data);
    const failures = results.filter((result) => result.error);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error?.message).toContain("ORDER_INSUFFICIENT_STOCK");

    const confirmation = successes[0]?.data as unknown as { orderId: string };
    createdOrderIds.push(confirmation.orderId);
    const state = await variantState(supabase, catalogue.variantId);
    expect(state).toMatchObject({ stockOnHand: 1, reservedQuantity: 1, availableQuantity: 0 });
    expect(await ledgerCount(supabase, confirmation.orderId, "RESERVED")).toBe(1);
  });

  test("concurrent notification workers never claim the same notification", async () => {
    const firstId = randomUUID();
    const secondId = randomUUID();
    createdNotificationIds.push(firstId, secondId);
    const { error: insertError } = await supabase.from("notifications").insert([
      {
        id: firstId,
        channel: "EMAIL",
        status: "PENDING",
        recipient: "phase16-claim-one@example.test",
        subject: "Phase 16 claim one",
        body: "Controlled test notification",
        template_key: "phase16_claim_test",
        scheduled_at: "1900-01-01T00:00:00.000Z",
        next_attempt_at: "1900-01-01T00:00:00.000Z",
      },
      {
        id: secondId,
        channel: "EMAIL",
        status: "PENDING",
        recipient: "phase16-claim-two@example.test",
        subject: "Phase 16 claim two",
        body: "Controlled test notification",
        template_key: "phase16_claim_test",
        scheduled_at: "1900-01-01T00:00:00.001Z",
        next_attempt_at: "1900-01-01T00:00:00.001Z",
      },
    ]);
    expect(insertError).toBeNull();

    const [firstClaim, secondClaim] = await Promise.all([
      supabase.rpc(
        "claim_notifications_server" as never,
        {
          batch_limit: 1,
          worker_id: "phase16-worker-one",
          stale_after_seconds: 900,
        } as never,
      ),
      supabase.rpc(
        "claim_notifications_server" as never,
        {
          batch_limit: 1,
          worker_id: "phase16-worker-two",
          stale_after_seconds: 900,
        } as never,
      ),
    ]);
    expect(firstClaim.error).toBeNull();
    expect(secondClaim.error).toBeNull();
    const claimedIds = [firstClaim.data, secondClaim.data].flatMap((claim) => {
      const rows = (claim as unknown as { notifications: Array<{ id: string }> }).notifications;
      return rows.map((row) => row.id);
    });
    expect(claimedIds.sort()).toEqual([firstId, secondId].sort());
    expect(new Set(claimedIds).size).toBe(2);
  });

  test("cancellation releases reservations exactly once", async () => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 10, quantity: 2 });
    const before = await variantState(supabase, fixture.variantId);
    expect(before.stockOnHand).toBe(10);
    expect(before.reservedQuantity).toBe(2);

    const key = `phase11-cancel-${randomUUID()}-${randomUUID()}`;
    const [first, second] = await Promise.all([
      transitionWithKey(
        supabase,
        orderManager,
        fixture.orderId,
        "CANCELLED",
        key,
        "Annulation E2E",
        "PENDING_CONFIRMATION",
      ),
      transitionWithKey(
        supabase,
        orderManager,
        fixture.orderId,
        "CANCELLED",
        key,
        "Annulation E2E",
        "PENDING_CONFIRMATION",
      ),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const after = await variantState(supabase, fixture.variantId);
    expect(after.stockOnHand).toBe(before.stockOnHand);
    expect(after.reservedQuantity).toBe(0);
    expect(await ledgerCount(supabase, fixture.orderId, "RELEASED")).toBe(1);
    expect(await historyCount(supabase, fixture.orderId, "CANCELLED")).toBe(1);
    expect(await auditCount(supabase, fixture.orderId, "ORDER_STATUS_CHANGED")).toBe(1);
  });

  test("delivery converts reservation into sold inventory exactly once", async () => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 10, quantity: 2 });
    await transitionOrder(supabase, orderManager, fixture.orderId, "CONFIRMED");
    await transitionOrder(supabase, orderManager, fixture.orderId, "PREPARING");
    await transitionOrder(supabase, orderManager, fixture.orderId, "OUT_FOR_DELIVERY");
    const before = await variantState(supabase, fixture.variantId);
    const key = `phase11-deliver-${randomUUID()}-${randomUUID()}`;

    const [first, second] = await Promise.all([
      transitionWithKey(
        supabase,
        orderManager,
        fixture.orderId,
        "DELIVERED",
        key,
        undefined,
        "OUT_FOR_DELIVERY",
      ),
      transitionWithKey(
        supabase,
        orderManager,
        fixture.orderId,
        "DELIVERED",
        key,
        undefined,
        "OUT_FOR_DELIVERY",
      ),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    const after = await variantState(supabase, fixture.variantId);
    expect(after.stockOnHand).toBe(before.stockOnHand - fixture.quantity);
    expect(after.reservedQuantity).toBe(before.reservedQuantity - fixture.quantity);
    expect(after.availableQuantity).toBe(before.availableQuantity);
    expect(await ledgerCount(supabase, fixture.orderId, "SOLD")).toBe(1);
    expect(await historyCount(supabase, fixture.orderId, "DELIVERED")).toBe(1);
  });

  test("returned order does not automatically restock", async () => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 10, quantity: 1 });
    await transitionOrder(supabase, orderManager, fixture.orderId, "CONFIRMED");
    await transitionOrder(supabase, orderManager, fixture.orderId, "PREPARING");
    await transitionOrder(supabase, orderManager, fixture.orderId, "OUT_FOR_DELIVERY");
    await transitionOrder(supabase, orderManager, fixture.orderId, "DELIVERED");
    const before = await variantState(supabase, fixture.variantId);

    const result = await transitionOrder(
      supabase,
      orderManager,
      fixture.orderId,
      "RETURNED",
      "Retour E2E",
    );
    expect(result.error).toBeNull();

    const after = await variantState(supabase, fixture.variantId);
    expect(after.stockOnHand).toBe(before.stockOnHand);
    expect(after.reservedQuantity).toBe(before.reservedQuantity);
    expect(await ledgerCount(supabase, fixture.orderId, "RETURNED")).toBe(0);
    expect(await historyCount(supabase, fixture.orderId, "RETURNED")).toBe(1);
  });

  test("payment confirmation creates immutable payment history once", async () => {
    const fixture = await createOrderFixture(supabase, {
      paymentMethod: "ORANGE_MONEY",
      stockOnHand: 10,
    });
    const key = `phase11-payment-${randomUUID()}-${randomUUID()}`;
    const [first, second] = await Promise.all([
      updatePaymentWithKey(supabase, orderManager, fixture.orderId, key),
      updatePaymentWithKey(supabase, orderManager, fixture.orderId, key),
    ]);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { count, error } = await supabase
      .from("payment_transactions")
      .select("id", { count: "exact", head: true })
      .eq("order_id", fixture.orderId)
      .eq("status", "PAID");
    expect(error).toBeNull();
    expect(count).toBe(1);
    expect(await auditCount(supabase, fixture.orderId, "ORDER_PAYMENT_STATUS_CHANGED")).toBe(1);
  });

  test("permission boundaries are enforced by the server function", async () => {
    test.skip(
      !hasActorEnv("CUSTOMER_SUPPORT") || !hasActorEnv("INVENTORY_MANAGER"),
      "CUSTOMER_SUPPORT and INVENTORY_MANAGER credentials are required for direct role permission verification.",
    );
    const fixture = await createOrderFixture(supabase, { stockOnHand: 10 });
    const support = await actorFromEnv("CUSTOMER_SUPPORT");
    const inventory = await actorFromEnv("INVENTORY_MANAGER");

    const supportResult = await transitionOrder(supabase, support, fixture.orderId, "CONFIRMED");
    const inventoryResult = await transitionOrder(
      supabase,
      inventory,
      fixture.orderId,
      "CONFIRMED",
    );
    const managerResult = await transitionOrder(
      supabase,
      orderManager,
      fixture.orderId,
      "CONFIRMED",
    );

    expect(supportResult.error?.message).toContain("ORDER_TRANSITION_UNAUTHORIZED");
    expect(inventoryResult.error?.message).toContain("ORDER_TRANSITION_UNAUTHORIZED");
    expect(managerResult.error).toBeNull();
  });

  test("conflicting transitions from CONFIRMED produce exactly one final mutation", async () => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 10, quantity: 1 });
    await transitionOrder(supabase, orderManager, fixture.orderId, "CONFIRMED");

    const [preparing, cancelled] = await Promise.all([
      transitionOrder(supabase, orderManager, fixture.orderId, "PREPARING", undefined, "CONFIRMED"),
      transitionOrder(
        supabase,
        orderManager,
        fixture.orderId,
        "CANCELLED",
        "Conflit E2E",
        "CONFIRMED",
      ),
    ]);
    const successes = [preparing, cancelled].filter((result) => !result.error);
    expect(successes).toHaveLength(1);

    const { data: order } = await supabase
      .from("orders")
      .select("status")
      .eq("id", fixture.orderId)
      .single();
    expect(["PREPARING", "CANCELLED"]).toContain(order?.status);
    expect(
      (await historyCount(supabase, fixture.orderId, "PREPARING")) +
        (await historyCount(supabase, fixture.orderId, "CANCELLED")),
    ).toBe(1);
  });

  test("cancellation versus delivery race cannot apply RELEASED and SOLD together", async () => {
    const fixture = await createOrderFixture(supabase, {
      deliveryMethod: "PICKUP",
      stockOnHand: 10,
      quantity: 1,
    });
    await transitionOrder(supabase, orderManager, fixture.orderId, "CONFIRMED");
    await transitionOrder(supabase, orderManager, fixture.orderId, "PREPARING");
    await transitionOrder(supabase, orderManager, fixture.orderId, "READY_FOR_PICKUP");

    const [cancelled, delivered] = await Promise.all([
      transitionOrder(
        supabase,
        orderManager,
        fixture.orderId,
        "CANCELLED",
        "Course annulation",
        "READY_FOR_PICKUP",
      ),
      transitionOrder(
        supabase,
        orderManager,
        fixture.orderId,
        "DELIVERED",
        undefined,
        "READY_FOR_PICKUP",
      ),
    ]);
    const successes = [cancelled, delivered].filter((result) => !result.error);
    expect(successes).toHaveLength(1);
    expect(
      (await ledgerCount(supabase, fixture.orderId, "RELEASED")) +
        (await ledgerCount(supabase, fixture.orderId, "SOLD")),
    ).toBe(1);
    const after = await variantState(supabase, fixture.variantId);
    expect(after.reservedQuantity).toBeGreaterThanOrEqual(0);
    expect(after.reservedQuantity).toBeLessThanOrEqual(after.stockOnHand);
  });

  test("Phase 10 adjustment racing delivery preserves inventory invariants", async () => {
    const fixture = await createOrderFixture(supabase, { stockOnHand: 3, quantity: 1 });
    await transitionOrder(supabase, orderManager, fixture.orderId, "CONFIRMED");
    await transitionOrder(supabase, orderManager, fixture.orderId, "PREPARING");
    await transitionOrder(supabase, orderManager, fixture.orderId, "OUT_FOR_DELIVERY");

    const [delivery, adjustment] = await Promise.all([
      transitionOrder(
        supabase,
        orderManager,
        fixture.orderId,
        "DELIVERED",
        undefined,
        "OUT_FOR_DELIVERY",
      ),
      adjustInventoryDecrease(supabase, owner, fixture.variantId, 1),
    ]);
    expect([delivery.error, adjustment.error].filter(Boolean).length).toBeLessThanOrEqual(1);
    const after = await variantState(supabase, fixture.variantId);
    expect(after.stockOnHand).toBeGreaterThanOrEqual(0);
    expect(after.reservedQuantity).toBeGreaterThanOrEqual(0);
    expect(after.reservedQuantity).toBeLessThanOrEqual(after.stockOnHand);
  });
});
