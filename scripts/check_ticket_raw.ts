import mysql from "mysql2/promise";
import "dotenv/config";

async function main() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const [rows] = await connection.execute('SELECT id, protocol, status, openedAt, createdAt FROM tickets WHERE id = 10 OR protocol LIKE "%9111-2%"');

  console.log("Ticket details (Raw SQL):");
  console.log(rows);

  await connection.end();
}

main().catch(console.error);


