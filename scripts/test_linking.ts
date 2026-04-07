import * as db from '../server/db';
import { tickets } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  try {
    const allContracts = await db.getAllContracts();
    if (allContracts.length === 0) {
      console.error('Nenhum contrato encontrado. Adicione um contrato primeiro.');
      return;
    }
    const contractId = allContracts[0].id;
    
    const reasons = await db.getAllAttendanceReasons();
    if (reasons.length === 0) {
      console.error('Nenhum motivo encontrado.');
      return;
    }
    const reasonId = reasons[0].id;
    
    const depts = await db.getAllDepartments();
    if (depts.length === 0) {
      console.error('Nenhum departamento encontrado.');
      return;
    }
    const deptId = depts[0].id;

    const email = `teste_${Date.now()}@exemplo.com`;
    const desc = `[E-mail: ${email}] - Teste de vinculação retroativa`;
    
    console.log(`Criando ticket órfão para ${email}...`);
    const result = await db.createTicket({
      ClienteId: null,
      contractId,
      reasonId,
      description: desc,
      priority: "media",
      currentDepartmentId: deptId,
    });
    
    console.log(`Ticket órfão criado: ${result.protocol}`);
    
    console.log('Criando CLIENTE para testar vinculação...');
    const coopId = await db.createCliente({
      registrationNumber: Math.floor(Math.random() * 100000000),
      name: "CLIENTE Teste Retroativo",
      document: "123.456.789-00",
      email: email,
      status: 'ativo'
    });
    
    console.log(`CLIENTE criado: ${coopId}`);
    
    const dbClient = await db.getDb();
    const updatedTicket = await dbClient!.select().from(tickets).where(eq(tickets.protocol, result.protocol)).limit(1);
    
    if (updatedTicket[0].ClienteId === coopId) {
      console.log('✅ SUCESSO: Ticket foi vinculado retroativamente!');
    } else {
      console.log('❌ FALHA: Ticket não foi vinculado.');
      console.log('Ticket Data:', JSON.stringify(updatedTicket[0], null, 2));
    }
  } catch (err) {
    console.error('Erro no teste:', err);
  } finally {
    process.exit(0);
  }
}

test();


