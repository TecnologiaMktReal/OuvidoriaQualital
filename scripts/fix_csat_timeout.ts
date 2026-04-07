import { getDb, quickMessages } from "../server/db";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Iniciando correção de timeout CSAT...");
    const database = await getDb();
    if (!database) {
        console.error("Falha ao conectar ao banco.");
        process.exit(1);
    }

    try {
        await database.update(quickMessages)
            .set({ timeoutMinutes: 60 })
            .where(eq(quickMessages.category, "BOT-CSAT_PERGUNTA"));
        
        console.log("✅ Timeout do BOT-CSAT_PERGUNTA atualizado para 60 minutos.");
    } catch (err) {
        console.error("Erro ao atualizar:", err);
    }
    process.exit(0);
}

main();


