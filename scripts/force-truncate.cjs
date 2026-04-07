const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const conn = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('Conectado ao banco. Truncando whatsapp_sessions...');
    await conn.query('TRUNCATE TABLE whatsapp_sessions');
    console.log('Tabela truncada com sucesso.');
    await conn.end();
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
})();


