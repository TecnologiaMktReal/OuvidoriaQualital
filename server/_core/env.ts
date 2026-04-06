const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE ??
  process.env.SERVICE_ROLE_KEY ??
  "";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseServiceKey,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "avatars",
  supabaseStorageBucketCooperativa: process.env.SUPABASE_STORAGE_BUCKET_COOPERATIVA,
  appBaseUrl:
    process.env.APP_BASE_URL ??
    process.env.FRONTEND_URL ??
    process.env.SITE_URL ??
    "http://localhost:3000",
};

// Debug logs seguros (apenas presença)
console.log("[ENV] VITE_APP_ID:", ENV.appId ? "✅ SET" : "❌ MISSING");
console.log("[ENV] DATABASE_URL:", ENV.databaseUrl ? "✅ SET" : "❌ MISSING");
console.log("[ENV] FORGE_API_KEY:", ENV.forgeApiKey ? "✅ SET" : "❌ MISSING");
console.log("[ENV] SUPABASE_URL:", ENV.supabaseUrl ? "✅ SET" : "❌ MISSING");





