const pool = require('./config/db');

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log('✅ MySQL connection successful!');
        console.log('✅ Connected to the big_little_things database.');

        connection.release();
        await pool.end();
    } catch (error) {
        console.error('❌ MySQL connection failed.');
        console.error(error.message);
    }
}

testConnection();