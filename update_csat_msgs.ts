
import dotenv from 'dotenv';
dotenv.config();
import { getDb, quickMessages } from './server/db';
import { eq, and } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) { console.error("No DB"); return; }

    console.log("Updating CSAT messages...");

    // Update EXCELENTE
    await db.update(quickMessages)
        .set({
            content: "Muito obrigado! 😍 Vamos continuar trabalhando para manter nossa excelência em cada detalhe. 🚀",
            updatedAt: new Date()
        })
        .where(eq(quickMessages.category, 'CSAT_EXCELENTE'));
    console.log("Updated CSAT_EXCELENTE");

    // Update BOM
    await db.update(quickMessages)
        .set({
            content: "Muito obrigado! 🙂 Vamos continuar trabalhando para melhorar nossa excelência em cada detalhe. 🚀",
            updatedAt: new Date()
        })
        .where(eq(quickMessages.category, 'CSAT_BOM'));
    console.log("Updated CSAT_BOM");

    // Update RUIM
    await db.update(quickMessages)
        .set({
            content: "Sinto muito pelo ocorrido. 😔 Já repassei seu relato para nossa supervisão verificar detalhadamente o que houve com este atendimento. Muito obrigado pelo seu feedback! 🙌 Caso prefira, você também pode entrar em contato com a nossa Ouvidoria COOPEDU através do site: coopedu.com.br. 🌐",
            updatedAt: new Date()
        })
        .where(eq(quickMessages.category, 'CSAT_RUIM'));
    console.log("Updated CSAT_RUIM");

    process.exit(0);
}

main().catch(console.error);


