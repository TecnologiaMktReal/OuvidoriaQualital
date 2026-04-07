import "dotenv/config";
import { getDb, deleteCliente } from "../server/db";
import { ClienteS } from "../drizzle/schema";
import { eq, or } from "drizzle-orm";

async function cleanup() {
  const db = await getDb();
  if (!db) return;
  
  const results = await db.select({ id: ClienteS.id }).from(ClienteS).where(
    or(
      eq(ClienteS.registrationNumber, 999999),
      eq(ClienteS.document, "123.456.789-00")
    )
  );
  
  for (const row of results) {
    console.log(`Deleting CLIENTE ${row.id}`);
    await deleteCliente(row.id);
  }
  
  process.exit(0);
}

cleanup();


