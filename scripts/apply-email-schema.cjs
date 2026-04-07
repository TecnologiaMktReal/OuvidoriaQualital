const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definido");

  const conn = await mysql.createConnection({ uri: url, multipleStatements: true });
  const sqlPath = path.join(__dirname, "../drizzle/0007_email_setup.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Aplicando schema de e-mail em", url);
  await conn.query(sql);
  const [rows] = await conn.query("SHOW TABLES LIKE 'email_accounts'");
  console.log("email_accounts:", rows);
  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});



