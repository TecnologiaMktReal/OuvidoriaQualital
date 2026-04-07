import * as db from '../server/db';
import { tickets } from '../drizzle/schema';
import { isNull } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

async function checkOrphans() {
  const dbClient = await db.getDb();
  if (!dbClient) {
    console.error('DB Client not available');
    return;
  }
  
  try {
    const orphaned = await dbClient.select().from(tickets).where(isNull(tickets.ClienteId)).limit(10);
    console.log('Orphaned Tickets Found:', orphaned.length);
    console.log(JSON.stringify(orphaned.map(t => ({ id: t.id, protocol: t.protocol, desc: t.description.substring(0, 100) })), null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkOrphans();


