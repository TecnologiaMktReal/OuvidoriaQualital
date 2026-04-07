import { getDb, whatsappSessions } from "../server/db";
import { eq } from "drizzle-orm";

async function check() {
  const db = await getDb();
  if (!db) {
      console.error("No DB connection");
      process.exit(1);
  }
  const rows = await db
    .select()
    .from(whatsappSessions)
    .where(eq(whatsappSessions.sessionName, "whatsapp-cloud-api"));
    
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});


