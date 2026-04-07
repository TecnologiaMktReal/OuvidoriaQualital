import dotenv from "dotenv";
dotenv.config();

import { getDb } from "../server/db";
import { contracts } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function check() {
  const db = await getDb();
  if (!db) {
    console.error("Failed to connect to DB");
    process.exit(1);
  }
  // Try to find a general contract
  const general = await db.select().from(contracts).where(eq(contracts.name, "Geral"));
  console.log("General contract:", general);
  
  if (general.length === 0) {
     console.log("No 'Geral' contract found.");
  }
  process.exit(0);
}

check();


