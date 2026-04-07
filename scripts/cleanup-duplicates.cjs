const mysql = require("mysql2/promise");
require("dotenv").config();

(async () => {
  const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3307/app_db";
  console.log("Conectando ao banco para limpeza de duplicatas...");
  
  try {
    const conn = await mysql.createConnection(url);
    
    // 1. Identificar IDs para manter (os mais recentes)
    console.log("Identificando registros para manter...");
    const [rows] = await conn.query("SELECT sessionName, MAX(id) as maxId FROM whatsapp_sessions GROUP BY sessionName");
    
    if (rows.length === 0) {
      console.log("Nenhum dado encontrado em whatsapp_sessions.");
    } else {
      const idsToKeep = rows.map(r => r.maxId);
      console.log("IDs para manter:", idsToKeep);
      
      // 2. Deletar os outros
      console.log("Removendo duplicatas...");
      const [delResult] = await conn.query("DELETE FROM whatsapp_sessions WHERE id NOT IN (?)", [idsToKeep]);
      console.log(`Removidos ${delResult.affectedRows} registros duplicados.`);
    }
    
    // 3. Adicionar índice único se não existir
    console.log("Adicionando índice único para sessionName...");
    try {
      await conn.query(`
        ALTER TABLE whatsapp_sessions 
        ADD UNIQUE INDEX whatsapp_sessions_session_name_unique (sessionName)
      `);
      console.log("Índice único criado com sucesso.");
    } catch (idxError) {
      if (idxError.code === 'ER_DUP_KEYNAME') {
        console.log("O índice único já existe.");
      } else {
        throw idxError;
      }
    }
    
    await conn.end();
    console.log("Cleanup concluído com sucesso.");
  } catch (err) {
    console.error("Erro durante o cleanup:", err.message);
    process.exit(1);
  }
})();


