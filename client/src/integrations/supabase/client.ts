// client/src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Validação crítica: bloqueia se as credenciais não existirem
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('❌ ERRO CRÍTICO: Credenciais do Supabase não encontradas!');
  console.error('Verifique se o arquivo .env existe na raiz do projeto com:');
  console.error('VITE_SUPABASE_URL=sua-url');
  console.error('VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave');
  console.error('\nReinicie o servidor após criar/editar o .env');
  
  // Cria um cliente "fake" para evitar crashes, mas não funcionará
  throw new Error('Supabase não configurado. Verifique o arquivo .env');
}

// Logs removidos para produção
// export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { ... });

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});




