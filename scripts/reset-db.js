
const pool = require('../config/db');

async function resetDatabase() {
    console.log('🔄 Resetting database...');
    const connection = await pool.getConnection();

    try {
        // Disable Foreign Key Check
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate Tables
        console.log('🗑️  Truncating products table...');
        await connection.query('TRUNCATE TABLE products');

        console.log('🗑️  Truncating uploads table...');
        await connection.query('TRUNCATE TABLE uploads');

        // Enable Foreign Key Check
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('✅ Database reset successfully! All data cleared.');

    } catch (error) {
        console.error('❌ Reset failed:', error);
    } finally {
        connection.release();
        // Force exit because pool connection might keep process alive
        process.exit();
    }
}

resetDatabase();
