import { getDb } from "../server/db";
import { emailLayouts } from "../drizzle/schema";

/**
 * Script para criar o layout de e-mail padrão do sistema
 * Este é o template HTML atualmente em uso para envios de e-mail
 */

const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      .container { max-width: 720px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .content { padding: 50px; color: #374151; line-height: 1.6; }
      .logo { margin-bottom: 35px; }
      .footer { padding: 25px 50px; border-top: 1px solid #e5e7eb; background-color: #ffffff; font-size: 12px; color: #9ca3af; }
      .side-bar { width: 42px; min-width: 42px; background-repeat: repeat-y; background-position: top center; background-size: 100% auto; opacity: 0.8; }
    </style>
  </head>
  <body>
    <div style="background-color: #f5f5f5; padding: 40px 10px;">
      <div class="container">
        <!-- Barra superior simulada do template Supabase -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
            <td class="content">
              <div class="logo">
                <img src="https://bit.ly/48zfoNw" alt="Logo Coopedu" width="170" style="display:block;">
              </div>
              <div style="font-size: 16px; color: #374151;">
                {{mensagem}}
              </div>
            </td>
            <td class="side-bar" style="background-image: url('https://bit.ly/3KGoyi0');">&nbsp;</td>
          </tr>
        </table>
        <div class="footer">
          <table width="100%">
            <tr>
              <td>© Coopedu - Todos os direitos reservados</td>
              <td align="right">
                <img src="https://bit.ly/48zfoNw" alt="Coopedu" width="70" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle; margin-right: 10px;">
                <img src="https://bit.ly/4oKEE89" alt="SomosCoop" width="50" style="opacity: 0.5; filter: grayscale(100%); display: inline-block; vertical-align: middle;">
              </td>
            </tr>
          </table>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9ca3af;">
        Mensagem automática - Help Desk Coopedu
      </div>
    </div>
  </body>
</html>`;

async function createDefaultEmailLayout() {
  try {
    const db = await getDb();
    
    console.log("🔍 Verificando se já existe um layout padrão...");
    
    // Verificar se já existe algum layout
    const existing = await db.select().from(emailLayouts).limit(1);
    
    if (existing.length > 0) {
      console.log("✅ Já existe um layout cadastrado. Nenhuma ação necessária.");
      return;
    }
    
    console.log("📝 Criando layout padrão do sistema...");
    
    // Criar o layout padrão
    await db.insert(emailLayouts).values({
      name: "Template Padrão Coopedu",
      description: "Template HTML oficial para envio de e-mails do sistema Help Desk. Inclui logo, barras laterais decorativas e rodapé com branding.",
      htmlContent: DEFAULT_EMAIL_TEMPLATE,
      isDefault: true,
      isActive: true,
    });
    
    console.log("✅ Layout padrão criado com sucesso!");
    console.log("📧 Este template agora está disponível na página de Layouts de E-mail");
    
  } catch (error) {
    console.error("❌ Erro ao criar layout padrão:", error);
    throw error;
  }
}

// Executar o script
createDefaultEmailLayout()
  .then(() => {
    console.log("\n✨ Migração concluída!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Falha na migração:", error);
    process.exit(1);
  });


