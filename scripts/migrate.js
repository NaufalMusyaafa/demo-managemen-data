
const pool = require('../config/db');

async function migrate() {
    console.log('🔄 Starting database migration...');
    const connection = await pool.getConnection();

    try {
        // 1. Create uploads table
        console.log('Creating uploads table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS uploads (
                id INT AUTO_INCREMENT PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                total_rows INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Add upload_id to products if not exists
        console.log('Checking products table columns...');
        const [columns] = await connection.query(`SHOW COLUMNS FROM products LIKE 'upload_id'`);
        
        if (columns.length === 0) {
            console.log('Adding upload_id column to products table...');
            await connection.query(`
                ALTER TABLE products 
                ADD COLUMN upload_id INT NULL,
                ADD CONSTRAINT fk_upload 
                FOREIGN KEY (upload_id) REFERENCES uploads(id) 
                ON DELETE SET NULL
            `);
        } else {
            console.log('Column upload_id already exists.');
        }

        console.log('✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        connection.release();
        process.exit();
    }
}

migrate();
