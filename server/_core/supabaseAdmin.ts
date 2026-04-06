import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./env";

// Debug: verificar se as variáveis estão sendo lidas
console.log("[Supabase Debug] URL:", ENV.supabaseUrl ? "✅ Configurada" : "❌ Vazia");
console.log("[Supabase Debug] Service Key:", ENV.supabaseServiceKey ? "✅ Configurada" : "❌ Vazia");

let adminClient: SupabaseClient | null = null;
let adminDisabled = false;

export function disableSupabaseAdmin(reason?: unknown) {
  adminClient = null;
  adminDisabled = true;
  if (reason) {
    console.warn("[Supabase Admin] Desativado. Motivo:", reason);
  }
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (adminDisabled) return null;
  if (adminClient) return adminClient;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceKey) {
    return null;
  }

  adminClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}



