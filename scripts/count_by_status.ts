import { drizzle } from "drizzle-orm/mysql2";
import { tickets } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(url);

  const results = await db
    .select({
      status: tickets.status,
      count: sql<number>`count(*)`,
    })
    .from(tickets)
    .groupBy(tickets.status);

  console.log("Global Ticket Counts by Status:");
  console.table(results);
}

main().catch(console.error);


