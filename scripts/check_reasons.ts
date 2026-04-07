import dotenv from "dotenv";
dotenv.config();
import { getDb } from "../server/db";
import { attendanceReasons, departments } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("DB not connected");
    process.exit(1);
  }
  const allReasons = await db.select().from(attendanceReasons);
  console.log("Reasons:", allReasons);
  const allDepts = await db.select().from(departments);
  console.log("Departments:", allDepts);
  process.exit(0);
}
main();


