import { drizzle } from "drizzle-orm/mysql2";
import { ticketStatuses } from "../drizzle/schema";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(url);

  const statuses = await db
    .select({
      id: ticketStatuses.id,
      name: ticketStatuses.name,
      slug: ticketStatuses.slug,
    })
    .from(ticketStatuses);

  console.log("System Ticket Statuses:");
  console.table(statuses);
}

main().catch(console.error);


