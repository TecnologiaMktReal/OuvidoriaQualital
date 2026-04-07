import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Credenciais do Supabase não encontradas. Verifique o .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = "ricardo.palacio@coopedu.com.br";
  const password = "Odracir48##!";

  console.log(`👤 Criando usuário SuperAdmin: ${email}...`);

  // 1. Criar usuário no Supabase Auth
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Confirma automaticamente
    user_metadata: {
      full_name: "Ricardo Palacio",
      role: "SuperAdmin"
    }
  });

  if (createError) {
    console.error("❌ Erro ao criar usuário:", createError.message);
    return;
  }

  console.log(`✅ Usuário criado com sucesso! ID: ${user.user.id}`);
  console.log("ℹ️ Agora, reinicie a aplicação para validar o login.");
}

createSuperAdmin().catch(console.error);


