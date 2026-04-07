const mysql = require("mysql2/promise");

(async () => {
  const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3307/app_db";
  console.log("Using DATABASE_URL:", url);
  try {
    const conn = await mysql.createConnection(url);
    
    // 1. Contracts
    const [contracts] = await conn.query("SELECT * FROM contracts");
    if (contracts.length === 0) {
        console.log("Seeding Contracts...");
        await conn.query(`
            INSERT INTO contracts (name, status, validityDate, isActive, city, state)
            VALUES ('Contrato Padrão', 'ativo', NOW(), 1, 'Fortaleza', 'CE')
        `);
    }

    // 2. Departments
    const [depts] = await conn.query("SELECT * FROM departments");
    if (depts.length === 0) {
        console.log("Seeding Departments...");
        await conn.query(`
            INSERT INTO departments (name, description, isActive)
            VALUES ('Atendimento', 'Departamento Principal de Atendimento', 1)
        `);
    }

    // 3. Attendance Reasons
    const [reasons] = await conn.query("SELECT * FROM attendance_reasons");
    if (reasons.length === 0) {
        console.log("Seeding Attendance Reasons...");
        await conn.query(`
            INSERT INTO attendance_reasons (name, description, slaHours, isActive)
            VALUES ('Dúvidas Gerais', 'Dúvidas gerais do cooperado', 24, 1)
        `);
    }

    console.log("Seed completed!");
    await conn.end();
  } catch (err) {
    console.error("Error:", err.message);
  }
})();


