import { drizzle } from "drizzle-orm/mysql2";
import { tickets } from "../drizzle/schema";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(url);

  const firstTickets = await db
    .select({
      id: tickets.id,
      protocol: tickets.protocol,
      status: tickets.status,
    })
    .from(tickets)
    .limit(20);

  console.log("First 20 tickets in database:");
  console.table(firstTickets);
}

main().catch(console.error);


