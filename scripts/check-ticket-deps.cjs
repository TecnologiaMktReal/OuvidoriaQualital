const mysql = require("mysql2/promise");

(async () => {
  const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3307/app_db";
  console.log("Using DATABASE_URL:", url);
  try {
    const conn = await mysql.createConnection(url);
    
    console.log("--- Deployments ---");
    const [depts] = await conn.query("SELECT * FROM departments");
    console.table(depts);

    console.log("--- Attendance Reasons ---");
    const [reasons] = await conn.query("SELECT * FROM attendance_reasons");
    console.table(reasons);

    console.log("--- Contracts ---");
    const [contracts] = await conn.query("SELECT * FROM contracts");
    console.table(contracts);

    await conn.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
})();


