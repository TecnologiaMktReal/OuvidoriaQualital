
import dotenv from 'dotenv';
dotenv.config();
import { getDb, quickMessages } from './server/db';
import { eq, and, like } from 'drizzle-orm';
import fs from 'fs';

async function main() {
    const db = await getDb();
    if (!db) { console.error("No DB"); return; }

    const msgs = await db.select().from(quickMessages).where(like(quickMessages.category, 'CSAT%'));
    
    let output = "=== CSAT MESSAGES IN DB ===\n";
    for (const msg of msgs) {
        output += `ID: ${msg.id} | Category: ${msg.category} | Active: ${msg.active}\n`;
        output += `Content: ${msg.content}\n`;
        output += "---------------------------------------------------\n";
    }
    fs.writeFileSync('csat_dump.txt', output);
    console.log("Dumped to csat_dump.txt");
    process.exit(0);
}

main().catch(console.error);


