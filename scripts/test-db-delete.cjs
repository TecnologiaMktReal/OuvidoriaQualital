const { createPool } = require('mysql2/promise');
require('dotenv').config();

async function main() {
  const pool = createPool({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

  console.log('--- Debugging Ticket Deletion ---');

  try {
    // 1. Get a candidate ticket (closed one preferably)
    const [rows] = await pool.query('SELECT id, protocol FROM tickets WHERE status = "fechado" LIMIT 1');
    
    if (rows.length === 0) {
      console.log('No closed tickets found to test deletion.');
      // Create a dummy ticket to test
      console.log('Creating a dummy ticket...');
      const [res] = await pool.query('INSERT INTO tickets (protocol, status, priority, openedAt, updatedAt) VALUES (?, "fechado", "media", NOW(), NOW())', [`TEST-${Date.now()}`]);
      const newId = res.insertId;
      console.log(`Created dummy ticket ID: ${newId}`);
      
      // Try deleting it
      console.log(`Attempting to delete ticket ID: ${newId}`);
      await pool.query('DELETE FROM tickets WHERE id = ?', [newId]);
      console.log('✅ Delete successful (Dummy Ticket)');
      return;
    }

    const ticket = rows[0];
    console.log(`Found candidate ticket: ID=${ticket.id}, Protocol=${ticket.protocol}`);

    // 2. Attempt deletion
    console.log(`Attempting to delete ticket ID: ${ticket.id}...`);
    try {
      await pool.query('DELETE FROM tickets WHERE id = ?', [ticket.id]);
      console.log('✅ Delete successful!');
    } catch (err) {
      console.error('❌ Delete FAILED:');
      console.error(err.message);
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        console.log('-> Reason: Foreign Key Constraint. "ON DELETE CASCADE" might be missing on child tables.');
      }
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    await pool.end();
  }
}

main();


