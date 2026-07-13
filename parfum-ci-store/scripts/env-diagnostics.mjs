const expectedEnvironmentVariables = [
  ["NEXT_PUBLIC_SUPABASE_URL", "public"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public"],
  ["SUPABASE_SECRET_KEY", "server"],
  ["SUPABASE_STORAGE_BUCKET", "server"],
  ["PLAYWRIGHT_OWNER_EMAIL", "test"],
  ["PLAYWRIGHT_OWNER_PASSWORD", "test"],
  ["PLAYWRIGHT_INVENTORY_MANAGER_EMAIL", "test"],
  ["PLAYWRIGHT_INVENTORY_MANAGER_PASSWORD", "test"],
  ["PLAYWRIGHT_ORDER_MANAGER_EMAIL", "test"],
  ["PLAYWRIGHT_ORDER_MANAGER_PASSWORD", "test"],
  ["PLAYWRIGHT_SUPPORT_EMAIL", "test"],
  ["PLAYWRIGHT_SUPPORT_PASSWORD", "test"],
  ["PLAYWRIGHT_INACTIVE_EMAIL", "test"],
  ["PLAYWRIGHT_INACTIVE_PASSWORD", "test"],
];

for (const [name, scope] of expectedEnvironmentVariables) {
  const status = process.env[name] ? "SET" : "MISSING";
  console.log(`${name}\t${scope}\t${status}`);
}
