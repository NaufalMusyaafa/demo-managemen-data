const pool = require('../config/db');
require('dotenv').config();

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log('Checking uploads table schema...');
        
        try {
            const [columns] = await connection.query('SHOW COLUMNS FROM uploads LIKE "table_name"');
            if (columns.length === 0) {
                console.log('Adding table_name column to uploads table...');
                await connection.query('ALTER TABLE uploads ADD COLUMN table_name VARCHAR(255) NULL AFTER filename');
                console.log('Migration successful: table_name column added.');
            } else {
                console.log('Column table_name already exists. Skipping.');
            }
        } finally {
            connection.release();
            process.exit(0);
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
