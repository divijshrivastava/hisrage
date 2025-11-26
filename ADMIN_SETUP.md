# Admin Authentication Setup Guide

## Overview

This guide explains how to set up and use the admin authentication system for the HisRage e-commerce platform.

## Features

- ✅ Secure login page with password hashing (bcrypt)
- ✅ Session-based authentication
- ✅ Admin-only access control
- ✅ Automatic redirect for unauthorized users
- ✅ Secure logout functionality
- ✅ Password visibility toggle
- ✅ Loading states and error handling

## Access URLs

- **Admin Login:** `https://hisrage.com/admin-login.html`
- **Admin Panel:** `https://hisrage.com/admin.html` (requires authentication)

## Creating an Admin User

### Method 1: Using Fly.io SSH Console (Recommended for Production)

1. **SSH into your Fly.io app:**
   ```bash
   flyctl ssh console --app hisrage
   ```

2. **Run the admin creation script:**
   ```bash
   node create-admin.js
   ```

3. **Follow the prompts:**
   - Enter admin email
   - Enter password (min 8 characters)
   - Confirm password
   - Enter first name (optional)
   - Enter last name (optional)

4. **Example:**
   ```
   🔥 HisRage Admin User Creation

   Admin Email: admin@hisrage.com
   Admin Password: ********
   Confirm Password: ********
   First Name (optional): Admin
   Last Name (optional): User

   🔒 Hashing password...
   👤 Creating admin user...

   ✅ Admin user created successfully!

   Admin Details:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ID:         1
   Email:      admin@hisrage.com
   Name:       Admin User
   Is Admin:   true
   Created:    2024-11-19T05:30:00.000Z
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   🎯 You can now login at: https://hisrage.com/admin-login.html
   📧 Email: admin@hisrage.com
   🔑 Password: [the password you entered]
   ```

### Method 2: Using Local Database Connection

If you have access to the database locally:

1. **Set up your `.env` file with database credentials**

2. **Run the script locally:**
   ```bash
   npm run create-admin
   ```

3. **Follow the same prompts as Method 1**

### Method 3: Direct SQL (For Advanced Users)

1. **Connect to your PostgreSQL database:**
   ```bash
   flyctl postgres connect --app hisrage-db
   ```

2. **Generate a password hash:**
   ```javascript
   // In Node.js REPL or create a quick script
   const bcrypt = require('bcryptjs');
   const password = 'YourSecurePassword123!';
   bcrypt.hash(password, 10).then(hash => console.log(hash));
   ```

3. **Insert admin user:**
   ```sql
   INSERT INTO users (email, password_hash, first_name, last_name, is_admin)
   VALUES (
       'admin@hisrage.com',
       '$2a$10$[your-hashed-password-here]',
       'Admin',
       'User',
       TRUE
   );
   ```

## Using the Admin Panel

### Logging In

1. Navigate to `https://hisrage.com/admin-login.html`
2. Enter your admin email address
3. Enter your password
4. Click "ACCESS ADMIN PANEL"
5. You'll be redirected to the admin panel on successful login

### Session Management

- Sessions are stored in PostgreSQL for persistence
- Sessions last 24 hours by default
- Session cookies are:
  - `httpOnly: true` (prevents XSS)
  - `secure: true` (in production, HTTPS only)
  - `sameSite: 'lax'` (CSRF protection)

### Logging Out

1. Click "Logout" in the admin panel navigation
2. You'll be redirected to the login page
3. Your session will be destroyed

## Security Features

### Password Requirements

- Minimum 8 characters (enforced in create-admin script)
- Recommend: Mix of uppercase, lowercase, numbers, and symbols

### Authentication Flow

1. **Login Request:**
   - User submits email and password
   - Backend verifies user exists and is admin
   - Password is compared using bcrypt
   - Session is created on success

2. **Protected Routes:**
   - All `/api/admin/*` endpoints check for valid session
   - Check for `req.session.userId` and `req.session.isAdmin`
   - Return 403 Forbidden if not authenticated

3. **Admin Panel:**
   - Checks authentication on page load
   - Redirects to login if not authenticated
   - Checks admin status via `/api/auth/me` endpoint

### Security Best Practices

✅ **Implemented:**
- Password hashing with bcrypt (10 rounds)
- Session-based authentication
- httpOnly cookies (prevents JavaScript access)
- CSRF protection via SameSite cookies
- Admin role verification on every request
- Secure password toggle (client-side only)

⚠️ **Recommended Enhancements:**
- [ ] Implement rate limiting on login attempts
- [ ] Add 2FA (Two-Factor Authentication)
- [ ] Implement password reset functionality
- [ ] Add account lockout after failed attempts
- [ ] Email verification for new admins
- [ ] Audit logging for admin actions
- [ ] Password strength requirements on frontend

## API Endpoints

### POST /api/auth/admin-login

Admin login endpoint.

**Request:**
```json
{
  "email": "admin@hisrage.com",
  "password": "YourPassword123!"
}
```

**Response (Success - 200):**
```json
{
  "message": "Admin login successful",
  "user": {
    "id": 1,
    "email": "admin@hisrage.com",
    "first_name": "Admin",
    "last_name": "User",
    "is_admin": true
  }
}
```

**Response (Invalid Credentials - 401):**
```json
{
  "error": "Invalid credentials"
}
```

**Response (Not Admin - 403):**
```json
{
  "error": "Access denied. Admin privileges required."
}
```

### POST /api/auth/logout

Logout endpoint (destroys session).

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

### GET /api/auth/me

Get current authenticated user.

**Response (200):**
```json
{
  "id": 1,
  "email": "admin@hisrage.com",
  "first_name": "Admin",
  "last_name": "User",
  "phone": null,
  "is_admin": true
}
```

**Response (Not Authenticated - 401):**
```json
{
  "error": "Not authenticated"
}
```

## Troubleshooting

### Can't Create Admin User

**Problem:** Script fails to connect to database

**Solutions:**
1. Check your `.env` file has correct `DATABASE_URL`
2. Verify PostgreSQL is running
3. Test connection: `psql $DATABASE_URL`
4. On Fly.io, use `flyctl ssh console` first

### Login Page Redirects Immediately

**Problem:** Already logged in as non-admin user

**Solution:**
1. Clear cookies for hisrage.com
2. Try in incognito/private mode
3. Logout from any existing session

### "Access Denied" After Login

**Problem:** User exists but is_admin is false

**Solution:**
1. Update user to admin:
   ```sql
   UPDATE users SET is_admin = TRUE WHERE email = 'your-email@example.com';
   ```

2. Or use the create-admin script which handles this automatically

### Session Not Persisting

**Problem:** Redirected to login after refresh

**Solutions:**
1. Check PostgreSQL session store is configured
2. Verify `session` table exists in database
3. Check browser allows cookies
4. Verify `SESSION_SECRET` is set in environment

**Check session store status in logs:**
```
✅ PostgreSQL session store configured
```

If you see:
```
❌ Failed to configure PostgreSQL session store
⚠️  Falling back to memory store
```

Then sessions won't persist across app restarts.

### Password Not Working

**Problem:** Can't login with password

**Solutions:**
1. Recreate admin user with create-admin script
2. Verify password meets minimum requirements (8 chars)
3. Check password hash in database is bcrypt format (starts with $2a$ or $2b$)
4. Clear browser cache and try again

## Managing Multiple Admins

### Add Another Admin

1. Run create-admin script again with new email
2. Or promote existing user:
   ```sql
   UPDATE users SET is_admin = TRUE WHERE email = 'newadmin@hisrage.com';
   ```

### Remove Admin Privileges

```sql
UPDATE users SET is_admin = FALSE WHERE email = 'user@hisrage.com';
```

### List All Admins

```sql
SELECT id, email, first_name, last_name, created_at
FROM users
WHERE is_admin = TRUE;
```

## File Structure

```
admin-login.html          # Admin login page
admin.html               # Admin panel (protected)
create-admin.js          # Admin user creation script
routes/auth.js           # Authentication endpoints
routes/admin.js          # Protected admin endpoints
```

## Environment Variables

Required in `.env` or Fly.io secrets:

```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
SESSION_SECRET=your-super-secret-session-key-change-this
NODE_ENV=production
```

## Deployment Checklist

Before deploying to production:

- [ ] Create admin user via SSH on Fly.io
- [ ] Set strong SESSION_SECRET
- [ ] Verify PostgreSQL session store is working
- [ ] Test login/logout flow
- [ ] Test protected routes
- [ ] Verify non-admin users can't access admin panel
- [ ] Check session persistence across app restarts
- [ ] Implement rate limiting (recommended)
- [ ] Set up monitoring for failed login attempts

## Quick Reference

### Creating First Admin (Production)

```bash
# 1. SSH into Fly.io
flyctl ssh console --app hisrage

# 2. Run admin creation
node create-admin.js

# 3. Follow prompts and note credentials

# 4. Exit SSH
exit

# 5. Login at https://hisrage.com/admin-login.html
```

### Resetting Admin Password

```bash
# SSH into app
flyctl ssh console --app hisrage

# Run create-admin with existing email
# It will update the password
node create-admin.js
```

### Checking Session Store

```bash
# View logs
flyctl logs --app hisrage

# Look for:
# ✅ PostgreSQL session store configured
```

## Support

For authentication issues:
1. Check browser console for errors
2. Check server logs: `flyctl logs --app hisrage`
3. Verify database connectivity
4. Test with curl to isolate frontend/backend issues

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
