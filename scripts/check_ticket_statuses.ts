import { drizzle } from "drizzle-orm/mysql2";
import { tickets } from "../drizzle/schema";
import { not, inArray } from "drizzle-orm";
import "dotenv/config";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }

  const db = drizzle(url);

  const terminalStatuses = ["atendimento_fechado", "ticket_invalido"];
  
  const openTickets = await db
    .select({
      id: tickets.id,
      protocol: tickets.protocol,
      status: tickets.status,
      assignedTo: tickets.assignedTo,
      currentDepartmentId: tickets.currentDepartmentId,
    })
    .from(tickets)
    .where(not(inArray(tickets.status, terminalStatuses as any)));

  console.log(`Found ${openTickets.length} open tickets according to current rules:`);
  console.table(openTickets);

  // Also list ALL unique statuses to see if there's any variation
  const allStatuses = await db.selectDistinct({ status: tickets.status }).from(tickets);
  console.log("\nAll unique statuses in the database:");
  console.table(allStatuses);
}

main().catch(console.error);


