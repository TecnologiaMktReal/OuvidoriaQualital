import dotenv from "dotenv";
dotenv.config();

import { publicRouter } from "../server/routers/public";
import { getDb } from "../server/db";
import { contracts, tickets } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  console.log("🚀 Iniciando teste de criação de ticket público...");

  const db = await getDb();
  if (!db) {
    console.error("❌ Erro ao conectar ao banco de dados.");
    process.exit(1);
  }

  // Mock de Contexto para Public Procedure
  const ctx = {
    req: {} as any,
    res: {} as any,
    user: null, // Sem usuário logado
    profileRole: null,
  };

  const caller = publicRouter.createCaller(ctx);

  // 1. Teste: Ticket Anônimo
  console.log("\n🧪 Testando Ticket Anônimo...");
  try {
    const result = await caller.createTicket({
      isAnonymous: true,
      description: "Teste de ticket anônimo via script automatizado.",
      reasonId: 1, // Assumindo que existe motivo com ID 1
    });
    console.log("✅ Ticket Anônimo criado:", result);
  } catch (error) {
    console.error("❌ Falha ao criar ticket anônimo:", error);
  }

  // 2. Teste: Ticket Identificado (Novo Usuário)
  console.log("\n🧪 Testando Ticket Identificado (CPF Inexistente)...");
  try {
    const cpfRandom = `000${Math.floor(Math.random() * 1000)}00000`;
    const result = await caller.createTicket({
      isAnonymous: false,
      name: "Teste Script Identificado",
      email: "teste.script@exemplo.com",
      cpf: cpfRandom,
      description: "Teste de ticket identificado via script.",
      reasonId: 1,
    });
    console.log("✅ Ticket Identificado criado:", result);
  } catch (error) {
    console.error("❌ Falha ao criar ticket identificado:", error);
  }

  // 3. Verificar Contrato Geral
  console.log("\n🔍 Verificando se contrato 'Geral' existe...");
  const geral = await db.select().from(contracts).where(eq(contracts.name, "Geral"));
  if (geral.length > 0) {
      console.log("✅ Contrato 'Geral' encontrado:", geral[0].id);
  } else {
      console.error("❌ Contrato 'Geral' NÃO encontrado!");
  }

  console.log("\n🏁 Testes finalizados.");
  process.exit(0);
}

main().catch(console.error);


