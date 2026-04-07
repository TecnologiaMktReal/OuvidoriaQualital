import mysql from 'mysql2/promise';

const PRODUCTION_DATABASE_URL = "mysql://root:yu1TPfqXtW8iUc305FM46DlC7EB9Qd2s@sjc1.clusters.zeabur.com:20354/zeabur";

async function checkProduction() {
  console.log("🚀 Conectando ao MySQL Produção (Zeabur)...");
  let connection;
  try {
    connection = await mysql.createConnection(PRODUCTION_DATABASE_URL);
    
    console.log("✅ Conectado!");
    
    const [tables] = await connection.query("SHOW TABLES");
    console.log("\n📊 Tabelas encontradas:");
    console.table(tables);
    
    const [deptCols] = await connection.query("SHOW COLUMNS FROM departments");
    console.log("\n🏢 Colunas de 'departments':");
    console.table(deptCols);

    const [users] = await connection.query("SELECT count(*) as count FROM users");
    console.log(`\n👥 Total de usuários: ${users[0].count}`);

    const [admin] = await connection.query("SELECT email, role FROM users WHERE email = 'ricardo.palacio@coopedu.com.br'");
    console.log("\n👤 Status do Admin:");
    console.table(admin);

  } catch (error) {
    console.error("❌ Erro ao conectar/consultar produção:", error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkProduction();


