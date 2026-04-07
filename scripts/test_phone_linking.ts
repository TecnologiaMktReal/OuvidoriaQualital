import * as db from '../server/db';
import { tickets } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function testPhone() {
  try {
    const allContracts = await db.getAllContracts();
    const contractId = allContracts[0].id;
    const reasons = await db.getAllAttendanceReasons();
    const reasonId = reasons[0].id;
    const depts = await db.getAllDepartments();
    const deptId = depts[0].id;

    const phone = `85${Math.floor(Math.random() * 100000000)}`;
    const desc = `Atendimento via WhatsApp - wa_id:${phone} - tel:${phone} - Teste`;
    
    console.log(`Criando ticket órfão para telefone ${phone}...`);
    const result = await db.createTicket({
      ClienteId: null,
      contractId,
      reasonId,
      description: desc,
      priority: "media",
      currentDepartmentId: deptId,
    });
    
    console.log(`Ticket órfão criado: ${result.protocol}`);
    
    console.log('Criando CLIENTE com esse WhatsApp...');
    const coopId = await db.createCliente({
      registrationNumber: Math.floor(Math.random() * 100000000),
      name: "CLIENTE Teste Fone",
      document: "000.000.000-00",
      whatsappNumber: phone,
      status: 'ativo'
    });
    
    console.log(`CLIENTE criado: ${coopId}`);
    
    const dbClient = await db.getDb();
    const updatedTicket = await dbClient!.select().from(tickets).where(eq(tickets.protocol, result.protocol)).limit(1);
    
    if (updatedTicket[0].ClienteId === coopId) {
      console.log('✅ SUCESSO: Ticket de WhatsApp foi vinculado retroativamente!');
    } else {
      console.log('❌ FALHA: Ticket de WhatsApp não foi vinculado.');
      console.log('Ticket Data:', JSON.stringify(updatedTicket[0], null, 2));
    }
  } catch (err) {
    console.error('Erro no teste de telefone:', err);
  } finally {
    process.exit(0);
  }
}

testPhone();


