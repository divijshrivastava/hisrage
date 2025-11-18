require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config');

async function migrate() {
    try {
        console.log('🚀 Starting database migration...');

        // Read the schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute the schema
        await pool.query(schema);

        console.log('✅ Database migration completed successfully!');
        console.log('📊 Tables created:');
        console.log('   - users');
        console.log('   - categories');
        console.log('   - products');
        console.log('   - carts');
        console.log('   - cart_items');
        console.log('   - orders');
        console.log('   - order_items');
        console.log('');
        console.log('🛒 Sample products added to database');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
