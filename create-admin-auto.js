require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/config');

async function createAdmin() {
    // Default admin credentials (change these!)
    const email = process.env.ADMIN_EMAIL || 'admin@hisrage.com';
    const password = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const lastName = process.env.ADMIN_LAST_NAME || 'User';

    console.log('\n🔥 HisRage Admin User Creation (Auto)\n');

    try {
        // Validate
        if (password.length < 8) {
            console.error('❌ Password must be at least 8 characters');
            process.exit(1);
        }

        // Check if user already exists
        const existing = await db.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            console.log(`⚠️  User ${email} already exists. Updating to admin...`);

            // Update existing user to admin
            await db.query(
                'UPDATE users SET is_admin = TRUE WHERE email = $1',
                [email]
            );

            console.log('✅ User updated to admin successfully!');
        } else {
            // Hash password
            console.log('🔒 Hashing password...');
            const password_hash = await bcrypt.hash(password, 10);

            // Create admin user
            console.log('👤 Creating admin user...');
            const result = await db.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
                VALUES ($1, $2, $3, $4, TRUE)
                RETURNING id, email, first_name, last_name, is_admin, created_at
            `, [email, password_hash, firstName, lastName]);

            const user = result.rows[0];

            console.log('\n✅ Admin user created successfully!');
            console.log('\nAdmin Details:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`ID:         ${user.id}`);
            console.log(`Email:      ${user.email}`);
            console.log(`Name:       ${user.first_name} ${user.last_name}`);
            console.log(`Is Admin:   ${user.is_admin}`);
            console.log(`Created:    ${user.created_at}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        console.log('\n🎯 You can now login at: https://hisrage.com/admin-login.html');
        console.log(`📧 Email: ${email}`);
        console.log('🔑 Password: [the password from ADMIN_PASSWORD env var]\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error creating admin:', error.message);
        process.exit(1);
    }
}

createAdmin();
