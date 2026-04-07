
import mysql from 'mysql2/promise';

async function main() {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'app_db',
        port: 3307
    });

    try {
        console.log('Connected. Running ALTER TABLE...');
        
        // Add ticketTypeId if not exists (check via try/catch or simple ignore)
        try {
            await connection.query('ALTER TABLE tickets ADD COLUMN ticketTypeId INT');
            console.log('Added ticketTypeId column.');
        } catch (e: any) {
            console.log('ticketTypeId might already exist:', e.message);
        }

        try {
            await connection.query('ALTER TABLE tickets ADD COLUMN criticityId INT');
            console.log('Added criticityId column.');
        } catch (e: any) {
             console.log('criticityId might already exist:', e.message);
        }

        try {
            await connection.query('ALTER TABLE tickets ADD CONSTRAINT fk_tickets_ticketTypeId FOREIGN KEY (ticketTypeId) REFERENCES ticket_types(id)');
            console.log('Added FK for ticketTypeId.');
        } catch (e: any) {
            console.log('FK for ticketTypeId might already exist:', e.message);
        }

        try {
            await connection.query('ALTER TABLE tickets ADD CONSTRAINT fk_tickets_criticityId FOREIGN KEY (criticityId) REFERENCES ticket_criticities(id)');
            console.log('Added FK for criticityId.');
        } catch (e: any) {
            console.log('FK for criticityId might already exist:', e.message);
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await connection.end();
        console.log('Done.');
    }
}
main();


