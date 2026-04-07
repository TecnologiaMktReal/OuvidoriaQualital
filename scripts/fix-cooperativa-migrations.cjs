// Ajusta migrations (marca 0000-0005), cria tabela cooperativas e marca 0006,
// sem apagar dados existentes. Uso: pnpm fix:coop
const mysql = require("mysql2/promise");

function getDbConfig() {
  // Se variáveis explícitas forem definidas, usam-se como estão (sem decode)
  if (process.env.DB_HOST || process.env.DB_USER || process.env.DB_PASSWORD || process.env.DB_NAME) {
    return {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "helpdesk_local",
      multipleStatements: true,
    };
  }

  // Caso contrário, tenta usar DATABASE_URL mas SEM decodificar a senha (usa literal)
  const url = process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "localhost",
      port: parsed.port ? Number(parsed.port) : 3306,
      user: parsed.username || "root",
      password: parsed.password || "",
      database: parsed.pathname?.replace(/^\//, "") || "helpdesk_local",
      multipleStatements: true,
    };
  }

  // Fallback manual literal (senha como fornecida)
  return {
    host: "localhost",
    user: "root",
    password: "yu1TPfqXtW8iUc305FM46DlC7EB9Qd2s",
    database: "helpdesk_local",
    multipleStatements: true,
  };
}

async function main() {
  const conn = await mysql.createConnection(getDbConfig());

  // Descobrir tabela de migrations
  const [t1] = await conn.query("SHOW TABLES LIKE '__drizzle_migrations'");
  const [t2] = await conn.query("SHOW TABLES LIKE 'drizzle__migrations'");
  let migTable = "__drizzle_migrations";
  if (!t1.length && t2.length) migTable = "drizzle__migrations";

  // Garantir tabela de migrations
  await conn.query(
    `CREATE TABLE IF NOT EXISTS \`${migTable}\` (
      id INT AUTO_INCREMENT PRIMARY KEY,
      hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL
    )`
  );

  // Tags já existentes
  const tags = [
    "0000_dazzling_sunspot",
    "0001_lethal_lady_ursula",
    "0002_silky_glorian",
    "0003_cloudy_jazinda",
    "0004_user_management",
    "0005_email_verified",
  ];

  for (const tag of tags) {
    await conn.query(
      `INSERT IGNORE INTO \`${migTable}\` (hash, created_at) VALUES (?, NOW())`,
      [tag]
    );
  }

  // Criar tabela cooperativas (se faltar)
  await conn.query(
    `CREATE TABLE IF NOT EXISTS cooperativas (
      id int AUTO_INCREMENT PRIMARY KEY,
      name varchar(255) NOT NULL,
      cnpj varchar(20) NOT NULL,
      email varchar(255),
      phone varchar(32),
      whatsapp varchar(32),
      street varchar(255),
      addressNumber varchar(20),
      neighborhood varchar(255),
      complement varchar(255),
      city varchar(255),
      state varchar(2),
      zipCode varchar(10),
      logoUrl text,
      createdAt timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updatedAt timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
      UNIQUE KEY cooperativas_cnpj_unique (cnpj)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );

  // Marca 0006 aplicada
  await conn.query(
    `INSERT IGNORE INTO \`${migTable}\` (hash, created_at) VALUES (?, NOW())`,
    ["0006_cooperativas"]
  );

  console.log(
    `OK: tabela ${migTable} atualizada e cooperativas criada/registrada.`
  );
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});



