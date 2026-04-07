import * as db from './server/db.js';

async function closeTicket() {
  const client = await db.getDb();
  if (!client) {
    console.error('Não foi possível conectar ao banco de dados');
    process.exit(1);
  }

  try {
    await db.updateTicket(76, { status: 'fechado' });
    console.log('✅ Ticket #20251230-9037 (ID: 76) fechado com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao fechar ticket:', error);
    process.exit(1);
  }
}

closeTicket();


