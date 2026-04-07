
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
        console.log('Connected.');
        // 1. Delete "TICKET FECHADO"
        const [delResult]: any = await connection.execute('DELETE FROM attendance_reasons WHERE name = ?', ['TICKET FECHADO']);
        console.log('Deleted TICKET FECHADO:', delResult.affectedRows);

        // 2. Create "Sem Motivo"
        const [semRows]: any = await connection.execute('SELECT id FROM attendance_reasons WHERE name = ?', ['Sem Motivo']);
        if (semRows.length === 0) {
            await connection.execute(
                'INSERT INTO attendance_reasons (name, isActive, slaMinutes, color, departmentId) VALUES (?, ?, ?, ?, ?)',
                ['Sem Motivo', 1, 0, '#94a3b8', 7] 
            );
            console.log('Created Sem Motivo');
        } else {
            console.log('Sem Motivo already exists');
        }

        // 3. Create "Atendimento por E-mail"
        const [emailRows]: any = await connection.execute('SELECT id FROM attendance_reasons WHERE name = ?', ['Atendimento por E-mail']);
        if (emailRows.length === 0) {
            await connection.execute(
                'INSERT INTO attendance_reasons (name, isActive, slaMinutes, color, departmentId) VALUES (?, ?, ?, ?, ?)',
                ['Atendimento por E-mail', 1, 0, '#6366f1', 7]
            );
            console.log('Created Atendimento por E-mail');
        } else {
             console.log('Atendimento por E-mail already exists');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
        console.log('Done.');
    }
}
main();


