const mysql = require("mysql2/promise");

(async () => {
  const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3307/app_db";
  console.log("Using DATABASE_URL:", url);
  try {
    const conn = await mysql.createConnection(url);
    const [rows] = await conn.query("SELECT * FROM whatsapp_sessions");
    console.log("whatsapp_sessions content:");
    console.dir(rows, { depth: null });
    
    const [configRows] = await conn.query("SELECT * FROM kv_store"); // Assuming config might be here? Or verified active type?
    // Actually check how 'getActiveType' works, it might use a KV store or just the session table?
    // Based on routers, it calls whatsappConfig.getActiveType().

    await conn.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
})();


