import { drizzle } from "drizzle-orm/mysql2";
import { tickets } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(url);

  const ticket = await db
    .select({
      id: tickets.id,
      protocol: tickets.protocol,
      status: tickets.status,
      openedAt: tickets.openedAt,
      createdAt: tickets.createdAt,
    })
    .from(tickets)
    .where(eq(tickets.id, 10));

  console.log("Ticket 10 details:");
  console.table(ticket);
}

main().catch(console.error);


