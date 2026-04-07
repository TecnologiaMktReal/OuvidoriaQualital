const { createPool } = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = createPool({
    uri: process.env.DATABASE_URL
  });

  try {
    console.log('Checking Profiles for Ricardo users...');
    
    // Join users, profiles, and profile_types
    const query = `
      SELECT 
        u.id as userId, 
        u.name as userName, 
        u.role as userRole,
        p.id as profileId,
        pt.name as profileTypeName,
        pt.role as profileTypeRole
      FROM users u
      LEFT JOIN profiles p ON p.userId = u.id
      LEFT JOIN user_profile_types pt ON p.profileTypeId = pt.id
      WHERE u.name LIKE '%RICARDO%'
    `;
    
    const [rows] = await pool.query(query);
    console.log(JSON.stringify(rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();


