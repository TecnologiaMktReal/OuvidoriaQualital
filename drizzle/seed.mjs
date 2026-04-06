import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL não está definida");
  process.exit(1);
}

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection, { schema, mode: "default" });

  try {
    // 0. Criar Tipos de Perfil (User Profile Types)
    console.log("👤 Verificando tipos de perfil...");
    
    // Ordem importa para bater com os IDs do Supabase (1..5)
    // Se ID 1 já existe (SuperAdmin), os próximos devem assumir 2, 3, 4, 5
    const profiles = [
      { name: "Super Administrador", role: "SuperAdmin", description: "Acesso total ao sistema" }, // ID 1
      { name: "Administrador", role: "admin", description: "Gestão administrativa" },            // ID 2
      { name: "Gerente", role: "gerente", description: "Gestão de equipes" },                     // ID 3
      { name: "Atendente", role: "atendente", description: "Operação de atendimento" },           // ID 4
      { name: "Cooperado", role: "user", description: "Usuário final / Cooperado" }               // ID 5
    ];
    
    for (const p of profiles) {
      const existing = await db
        .select({ id: schema.userProfileTypes.id })
        .from(schema.userProfileTypes)
        .where(eq(schema.userProfileTypes.role, p.role))
        .limit(1);
        
      if (existing.length === 0) {
        await db.insert(schema.userProfileTypes).values(p);
        console.log(`✅ Perfil '${p.name}' criado`);
      }
    }
    console.log("✅ Verificação de perfis concluída");

    // 1. Criar departamentos iniciais
    console.log("📁 Criando departamentos...");
    const existingDepartments = await db
      .select({ id: schema.departments.id })
      .from(schema.departments)
      .limit(1);
      
    if (existingDepartments.length === 0) {
      const departmentNames = [
        "Atendimento",  // 1
        "Ouvidoria",    // 2 (Warning match)
        "RH",           // 3
        "Logística",    // 4
        "Financeiro",   // 5
        "Tesouraria",   // 6 (Warning match)
        "Jurídico",     // 7
        "Presidência",  // 8 (Warning match)
        "Tecnologia"    // 9 (Warning match - Extra)
      ];

      for (const name of departmentNames) {
        await db.insert(schema.departments).values({
          name,
          description: `Departamento de ${name}`,
          isActive: true,
        });
      }
      console.log(`✅ ${departmentNames.length} departamentos criados`);
    } else {
       // Se já existem, verificamos se precisamos adicionar o 9 (Tecnologia) se não existir
       // Mas como o usuário reportou warnings, assumimos que estão faltando ou desalinhados.
       // Se a tabela estava vazia no check anterior, vai entrar no if acima.
       console.log("ℹ️ Departamentos já existem");
    }

    // 2. Criar contrato especial "NÃO COOPERADO"
    console.log("📄 Criando contrato especial...");
    const existingSpecialContract = await db
      .select({ id: schema.contracts.id })
      .from(schema.contracts)
      .where(eq(schema.contracts.name, "NÃO COOPERADO"))
      .limit(1);

    if (existingSpecialContract.length > 0) {
      console.log("ℹ️ Contrato 'NÃO COOPERADO' já existe, pulando etapa");
    } else {
      await db.insert(schema.contracts).values({
        name: "NÃO COOPERADO",
        city: "N/A",
        state: "NA",
        status: "ativo",
        isSpecial: true,
      });
      console.log("✅ Contrato 'NÃO COOPERADO' criado");
    }

    // 3. Criar motivos de atendimento hierárquicos
    console.log("📋 Criando motivos de atendimento...");
    const existingReasons = await db
      .select({ id: schema.attendanceReasons.id })
      .from(schema.attendanceReasons)
      .limit(1);
    if (existingReasons.length > 0) {
      console.log("ℹ️ Motivos de atendimento já existem, pulando etapa");
      console.log("🎉 Seed concluído com sucesso!");
      return;
    }
    
    // Motivos principais
    const financeiroResult = await db.insert(schema.attendanceReasons).values({
      name: "Financeiro",
      description: "Questões financeiras gerais",
      slaHours: 48,
      isActive: true,
    });
    const financeiroId = Number(financeiroResult[0].insertId);

    const tecnicoResult = await db.insert(schema.attendanceReasons).values({
      name: "Técnico",
      description: "Suporte técnico e problemas operacionais",
      slaHours: 24,
      isActive: true,
    });
    const tecnicoId = Number(tecnicoResult[0].insertId);

    const comercialResult = await db.insert(schema.attendanceReasons).values({
      name: "Comercial",
      description: "Questões comerciais e vendas",
      slaHours: 72,
      isActive: true,
    });
    const comercialId = Number(comercialResult[0].insertId);

    // Submotivos de Financeiro
    await db.insert(schema.attendanceReasons).values([
      {
        name: "Boleto",
        description: "Solicitação de boleto",
        parentId: financeiroId,
        slaHours: 24,
        isActive: true,
      },
      {
        name: "Segunda Via",
        description: "Solicitação de segunda via de documentos",
        parentId: financeiroId,
        slaHours: 24,
        isActive: true,
      },
      {
        name: "Pagamento",
        description: "Dúvidas sobre pagamentos",
        parentId: financeiroId,
        slaHours: 48,
        isActive: true,
      },
    ]);

    // Submotivos de Técnico
    await db.insert(schema.attendanceReasons).values([
      {
        name: "Problema no Sistema",
        description: "Erro ou falha no sistema",
        parentId: tecnicoId,
        slaHours: 12,
        isActive: true,
      },
      {
        name: "Dúvida de Uso",
        description: "Dúvida sobre como usar o sistema",
        parentId: tecnicoId,
        slaHours: 24,
        isActive: true,
      },
    ]);

    // Submotivos de Comercial
    await db.insert(schema.attendanceReasons).values([
      {
        name: "Novo Contrato",
        description: "Solicitação de novo contrato",
        parentId: comercialId,
        slaHours: 72,
        isActive: true,
      },
      {
        name: "Renovação",
        description: "Renovação de contrato existente",
        parentId: comercialId,
        slaHours: 48,
        isActive: true,
      },
    ]);

    console.log("✅ Motivos de atendimento criados com hierarquia");

    console.log("🎉 Seed concluído com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante seed:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});



