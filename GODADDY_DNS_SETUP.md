# GoDaddy DNS Configuration for HisRage.com

## Step-by-Step Instructions

### 1. Login to GoDaddy

Go to https://dcc.godaddy.com/ and sign in with your account.

### 2. Navigate to DNS Management

1. Click on your profile name in the top right
2. Select "My Products"
3. Find "hisrage.com" and click "DNS" button

### 3. Delete Existing Records (if any)

Before adding new records, delete any existing A, AAAA, or CNAME records for:
- @ (root domain)
- www

### 4. Add DNS Records

Click "ADD" button and add the following records exactly as shown:

#### Record 1: Root Domain A Record
```
Type:   A
Name:   @
Value:  66.241.125.172
TTL:    600 seconds (10 minutes)
```

#### Record 2: Root Domain AAAA Record (IPv6)
```
Type:   AAAA
Name:   @
Value:  2a09:8280:1::b1:6ef4:0
TTL:    600 seconds
```

#### Record 3: WWW Subdomain A Record
```
Type:   A
Name:   www
Value:  66.241.125.172
TTL:    600 seconds
```

#### Record 4: WWW Subdomain AAAA Record
```
Type:   AAAA
Name:   www
Value:  2a09:8280:1::b1:6ef4:0
TTL:    600 seconds
```

### 5. Save All Records

Click "Save" after adding each record.

### 6. Wait for DNS Propagation

DNS changes can take 5-60 minutes to propagate. You can check the status using:

```bash
# Check if DNS has updated
dig hisrage.com +short
# Should show: 66.241.125.172

dig www.hisrage.com +short
# Should show: 66.241.125.172
```

Or use online tools:
- https://dnschecker.org

### 7. Verify SSL Certificate

Once DNS has propagated, check your SSL certificate status:

```bash
flyctl certs check hisrage.com --app hisrage
flyctl certs check www.hisrage.com --app hisrage
```

Wait until status shows "Ready" for both domains.

### 8. Test Your Website

Visit these URLs in your browser:
- https://hisrage.com
- https://www.hisrage.com
- https://hisrage.com/api/health

All should work with a valid SSL certificate (padlock icon).

## Visual Guide

Your GoDaddy DNS Management page should look like this:

```
┌─────────────────────────────────────────────────────────────┐
│ Type    Name    Value                         TTL           │
├─────────────────────────────────────────────────────────────┤
│ A       @       66.241.125.172               600 seconds   │
│ AAAA    @       2a09:8280:1::b1:6ef4:0       600 seconds   │
│ A       www     66.241.125.172               600 seconds   │
│ AAAA    www     2a09:8280:1::b1:6ef4:0       600 seconds   │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### DNS Not Updating
- Clear your browser cache
- Try incognito mode
- Wait longer (up to 24 hours in rare cases)
- Use `dig` command to verify

### SSL Certificate Not Provisioning
```bash
# Force certificate check
flyctl certs check hisrage.com --app hisrage
```

If it shows errors, wait for DNS to fully propagate.

### Website Not Loading
1. Check DNS propagation first
2. Check Fly.io app status: `flyctl status --app hisrage`
3. Check logs: `flyctl logs --app hisrage`

## Alternative: Using CNAME for WWW

If you prefer, you can use CNAME for www instead of A/AAAA records:

```
Type:   CNAME
Name:   www
Value:  e0y05xj.hisrage.fly.dev
TTL:    600 seconds
```

This is simpler but the A/AAAA approach is recommended for better performance.

## Support

If you have issues:
- Check Fly.io dashboard: https://fly.io/apps/hisrage
- GoDaddy Support: https://www.godaddy.com/help
- Fly.io Community: https://community.fly.io/

---

**Once configured, your HisRage e-commerce platform will be live! 🔥**
