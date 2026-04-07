import mysql from "mysql2/promise";
import "dotenv/config";

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not found in .env");
    process.exit(1);
  }
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log("Starting surgical migration v2...");
  
  try {
    // Disable foreign key checks
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    console.log("Adding columns to ticket_statuses...");
    try {
      await connection.query(`
        ALTER TABLE ticket_statuses 
        ADD COLUMN timeoutMinutes INT,
        ADD COLUMN nextStatusSlug VARCHAR(64);
      `);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Columns already exist in ticket_statuses.");
      } else {
        throw e;
      }
    }

    console.log("Adding defaultStatusSlug to attendance_reasons...");
    try {
      await connection.query(`
        ALTER TABLE attendance_reasons 
        ADD COLUMN defaultStatusSlug VARCHAR(64);
      `);
    } catch (e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column defaultStatusSlug already exists in attendance_reasons.");
      } else {
        throw e;
      }
    }

    // Check if slaHours exists and rename to slaMinutes
    const [columns]: any = await connection.query("SHOW COLUMNS FROM attendance_reasons LIKE 'slaHours'");
    if (columns.length > 0) {
      console.log("Renaming slaHours to slaMinutes in attendance_reasons...");
      await connection.query("ALTER TABLE attendance_reasons CHANGE slaHours slaMinutes INT NOT NULL DEFAULT 2880;");
    } else {
      console.log("slaHours not found or already renamed in attendance_reasons.");
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("Migration completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await connection.end();
  }
}

migrate();


