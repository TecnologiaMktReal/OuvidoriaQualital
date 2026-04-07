const { createPool } = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = createPool({
    uri: process.env.DATABASE_URL
  });

  try {
    console.log('Updating roles to ADMIN for Ricardo users...');
    
    // Update by ID to be precise based on previous output
    const targetIds = [1, 7];
    
    const [result] = await pool.query(
      'UPDATE users SET role = "admin" WHERE id IN (?)',
      [targetIds]
    );

    console.log(`Updated ${result.changedRows} users to admin.`);
    
    const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id IN (?)', [targetIds]);
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();


