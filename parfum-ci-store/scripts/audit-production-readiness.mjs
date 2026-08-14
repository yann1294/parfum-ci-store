import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const supabase = createClient(supabaseUrl, required("SUPABASE_SECRET_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

function projectRef(url) {
  const hostname = new URL(url).hostname;
  return hostname.endsWith(".supabase.co") ? hostname.slice(0, -".supabase.co".length) : "local";
}

async function exactCount(label, table, configure = (query) => query) {
  const { count, error } = await configure(
    supabase.from(table).select("id", { count: "exact", head: true }),
  );
  if (error) throw new Error(`READINESS_AUDIT_QUERY_FAILED:${label}`);
  return count ?? 0;
}

async function getProfiles() {
  const { data, error } = await supabase.from("profiles").select("role, active");
  if (error) throw new Error("READINESS_AUDIT_QUERY_FAILED:profiles");

  return (data ?? []).reduce((summary, profile) => {
    const key = `${profile.role}:${profile.active ? "active" : "inactive"}`;
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

async function getAuthSummary() {
  const summary = { total: 0, testCandidateCount: 0 };
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("READINESS_AUDIT_QUERY_FAILED:auth_users");
    const users = data.users ?? [];
    summary.total += users.length;
    summary.testCandidateCount += users.filter((user) =>
      /(?:^|[+._-])(test|e2e|playwright|fixture)(?:[+._-]|@|$)/i.test(user.email ?? ""),
    ).length;
    if (users.length < 1000) break;
    page += 1;
  }

  return summary;
}

async function getStoreReadiness() {
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "accepting_orders, maintenance_mode, store_name, contact_email, support_email, contact_phone, whatsapp_number, primary_address, logo_url, canonical_site_url, notification_email, payment_method_configs, delivery_method_configs",
    )
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error("READINESS_AUDIT_QUERY_FAILED:store_settings");
  if (!data) return { singletonPresent: false };

  const paymentConfigs = data.payment_method_configs ?? {};
  const deliveryConfigs = data.delivery_method_configs ?? {};
  const enabledCount = (value) =>
    Object.values(value).filter((item) => item && typeof item === "object" && item.enabled === true)
      .length;

  return {
    singletonPresent: true,
    acceptingOrders: data.accepting_orders,
    maintenanceMode: data.maintenance_mode,
    configured: {
      storeName: Boolean(data.store_name?.trim()),
      contactEmail: Boolean(data.contact_email),
      supportEmail: Boolean(data.support_email),
      contactPhone: Boolean(data.contact_phone),
      whatsapp: Boolean(data.whatsapp_number),
      primaryAddress: Boolean(data.primary_address),
      logo: Boolean(data.logo_url),
      canonicalSiteUrl: Boolean(data.canonical_site_url),
      notificationEmail: Boolean(data.notification_email),
    },
    enabledPaymentMethodCount: enabledCount(paymentConfigs),
    enabledDeliveryMethodCount: enabledCount(deliveryConfigs),
  };
}

async function getStorageSummary() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw new Error("READINESS_AUDIT_QUERY_FAILED:storage_buckets");
  return (data ?? []).map((bucket) => ({
    id: bucket.id,
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? null,
    allowedMimeTypes: bucket.allowed_mime_types ?? [],
  }));
}

async function main() {
  const [profiles, auth, store, storage, counts, fixtureCandidates] = await Promise.all([
    getProfiles(),
    getAuthSummary(),
    getStoreReadiness(),
    getStorageSummary(),
    Promise.all(
      [
        "brands",
        "categories",
        "products",
        "product_variants",
        "product_images",
        "customers",
        "orders",
        "payment_transactions",
        "inventory_transactions",
        "contact_messages",
        "notifications",
        "storefront_order_intents",
        "audit_logs",
      ].map(async (table) => [table, await exactCount(table, table)]),
    ),
    Promise.all([
      exactCount("fixture_products", "products", (query) =>
        query.or("slug.ilike.e2e-%,slug.ilike.%manual-65-20260716%"),
      ),
      exactCount("fixture_variants", "product_variants", (query) =>
        query.or("sku.ilike.E2E-%,sku.ilike.%MANUAL65%"),
      ),
      exactCount("fixture_orders", "orders", (query) =>
        query.or(
          "customer_name.ilike.%test%,customer_name.ilike.%e2e%,customer_email.ilike.%example.test%",
        ),
      ),
      exactCount("fixture_customers", "customers", (query) =>
        query.or("full_name.ilike.%test%,full_name.ilike.%e2e%,email.ilike.%example.test%"),
      ),
      exactCount("fixture_messages", "contact_messages", (query) =>
        query.or(
          "customer_name.ilike.%test%,subject.ilike.%test%,customer_email.ilike.%example.test%",
        ),
      ),
    ]),
  ]);

  const [products, variants, orders, customers, messages] = fixtureCandidates;
  const report = {
    generatedAt: new Date().toISOString(),
    projectRef: projectRef(supabaseUrl),
    readOnly: true,
    rowCounts: Object.fromEntries(counts),
    profilesByRoleAndState: profiles,
    auth,
    knownFixtureCandidates: { products, variants, orders, customers, messages },
    store,
    storage,
    classification: {
      intendedCatalogueAndSettings: "REVIEW_MANUALLY_THEN_KEEP",
      activeTestStaff: "REVIEW_MANUALLY_THEN_DISABLE",
      knownFixtureCatalogue: "REVIEW_MANUALLY_THEN_ARCHIVE_OR_REMOVE",
      transactionalHistory: "ARCHIVE_OR_KEEP_DO_NOT_DELETE_CASUALLY",
      auditAndLedgerHistory: "KEEP",
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

await main();
