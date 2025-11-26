require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db/config');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    console.log('\n🔥 HisRage Admin User Creation\n');

    try {
        // Get admin details
        const email = await question('Admin Email: ');
        const password = await question('Admin Password: ');
        const confirmPassword = await question('Confirm Password: ');
        const firstName = await question('First Name (optional): ');
        const lastName = await question('Last Name (optional): ');

        // Validate input
        if (!email || !password) {
            console.error('❌ Email and password are required');
            process.exit(1);
        }

        if (password !== confirmPassword) {
            console.error('❌ Passwords do not match');
            process.exit(1);
        }

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
            console.log('\n⚠️  User already exists. Updating to admin...');

            // Update existing user to admin
            await db.query(
                'UPDATE users SET is_admin = TRUE WHERE email = $1',
                [email]
            );

            console.log('✅ User updated to admin successfully!');
        } else {
            // Hash password
            console.log('\n🔒 Hashing password...');
            const password_hash = await bcrypt.hash(password, 10);

            // Create admin user
            console.log('👤 Creating admin user...');
            const result = await db.query(`
                INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
                VALUES ($1, $2, $3, $4, TRUE)
                RETURNING id, email, first_name, last_name, is_admin, created_at
            `, [
                email,
                password_hash,
                firstName || null,
                lastName || null
            ]);

            const user = result.rows[0];

            console.log('\n✅ Admin user created successfully!');
            console.log('\nAdmin Details:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`ID:         ${user.id}`);
            console.log(`Email:      ${user.email}`);
            console.log(`Name:       ${user.first_name || ''} ${user.last_name || ''}`);
            console.log(`Is Admin:   ${user.is_admin}`);
            console.log(`Created:    ${user.created_at}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        console.log('\n🎯 You can now login at: https://hisrage.com/admin-login.html');
        console.log(`📧 Email: ${email}`);
        console.log('🔑 Password: [the password you entered]\n');

    } catch (error) {
        console.error('\n❌ Error creating admin:', error.message);
        process.exit(1);
    } finally {
        rl.close();
        process.exit(0);
    }
}

createAdmin();
