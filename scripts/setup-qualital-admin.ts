
import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

async function setupAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const email = "ricardopalacio33@gmail.com";
  const password = "Odracir48!";

  console.log(`🚀 Criando usuário no Supabase: ${email}...`);

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { 
      fullName: "Ricardo Palacio",
      role: "SuperAdmin"
    },
    app_metadata: {
      role: "SuperAdmin"
    }
  });

  if (error) {
    if (error.message.includes("already exists")) {
      console.log(`ℹ️ Usuário ${email} já existe no Supabase.`);
      // Tentar resetar a senha para garantir acesso
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id || "",
        { password }
      );
      if (updateError) console.error("⚠️ Erro ao atualizar senha:", updateError.message);
      else console.log("✅ Senha atualizada!");
    } else {
      console.error("❌ Erro ao criar usuário:", error.message);
      process.exit(1);
    }
  } else {
    console.log(`✅ Usuário criado com UID: ${data.user.id}`);
  }

  console.log("\n✨ Pronto! Agora inicie o servidor (pnpm dev) para que o sistema sincronize e promova o usuário automaticamente.");
}

setupAdmin().catch(console.error);


