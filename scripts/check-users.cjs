const { createPool } = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = createPool({
    uri: process.env.DATABASE_URL
  });

  try {
    const [rows] = await pool.query('SELECT id, name, email, role FROM users');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();


