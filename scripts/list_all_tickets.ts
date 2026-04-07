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

  const allTickets = await db
    .select({
      id: tickets.id,
      protocol: tickets.protocol,
      status: tickets.status,
    })
    .from(tickets);

  console.log(`Total tickets in database: ${allTickets.length}`);
  console.table(allTickets);
}

main().catch(console.error);


