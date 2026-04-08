import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { logger } from "../_core/logger";

let _db: any = null;
let migrationsApplied = false;

export async function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }

  try {
    const connection = await mysql.createPool(connectionString);
    _db = drizzle(connection);
    
    // Migrations are handled by internal scripts, but we could add safety here
    
    return _db;
  } catch (error) {
    logger.error("Failed to connect to database:", error);
    throw error;
  }
}



