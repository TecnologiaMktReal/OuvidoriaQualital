const mysql = require("mysql2/promise");

(async () => {
  const url = process.env.DATABASE_URL;
  console.log("DATABASE_URL:", url);
  const conn = await mysql.createConnection(url);
  const [db] = await conn.query("SELECT DATABASE() as db");
  console.log("DB:", db);
  const [rows] = await conn.query("SHOW TABLES LIKE 'email_accounts'");
  console.log("email_accounts:", rows);
  await conn.end();
})();

