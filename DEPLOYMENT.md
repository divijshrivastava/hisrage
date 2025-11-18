# HisRage Deployment Guide

This guide will walk you through deploying your HisRage e-commerce platform to Fly.io and configuring your GoDaddy domain.

## Prerequisites

1. Fly.io account (sign up at https://fly.io)
2. GoDaddy domain (hisrage.com)
3. Razorpay account (for Indian payments)
4. Stripe account (for international payments)

## Step 1: Install Fly.io CLI

```bash
# macOS
brew install flyctl

# Or using curl
curl -L https://fly.io/install.sh | sh
```

## Step 2: Login to Fly.io

```bash
flyctl auth login
```

## Step 3: Create PostgreSQL Database on Fly.io

```bash
flyctl postgres create --name hisrage-db --region sin
```

Note the connection string that's displayed. It will look like:
```
postgres://postgres:password@hisrage-db.internal:5432
```

## Step 4: Attach Database to Your App

```bash
flyctl postgres attach hisrage-db --app hisrage
```

## Step 5: Set Environment Variables

```bash
# Set production secrets
flyctl secrets set \
  JWT_SECRET="your-super-secret-jwt-key-$(openssl rand -hex 32)" \
  SESSION_SECRET="your-session-secret-$(openssl rand -hex 32)" \
  RAZORPAY_KEY_ID="your_razorpay_key_id" \
  RAZORPAY_KEY_SECRET="your_razorpay_key_secret" \
  STRIPE_PUBLISHABLE_KEY="your_stripe_publishable_key" \
  STRIPE_SECRET_KEY="your_stripe_secret_key" \
  FRONTEND_URL="https://hisrage.com" \
  --app hisrage
```

## Step 6: Deploy to Fly.io

```bash
# Initial deployment
flyctl launch --name hisrage --region sin --no-deploy

# Deploy the application
flyctl deploy
```

## Step 7: Run Database Migrations

```bash
flyctl ssh console --app hisrage

# Once inside the container
node db/migrate.js
exit
```

## Step 8: Configure Custom Domain on Fly.io

```bash
# Add your domain
flyctl certs create hisrage.com --app hisrage

# Add www subdomain
flyctl certs create www.hisrage.com --app hisrage
```

Fly.io will display the DNS records you need to add. Example output:
```
Certificate for hisrage.com created
Add these DNS records:

CNAME www hisrage.fly.dev
A     @   66.241.124.100 (or similar)
AAAA  @   2a09:8280:1::1:2345 (or similar)
```

## Step 9: Configure GoDaddy DNS

1. Log in to GoDaddy (https://dcc.godaddy.com/control/hisrage.com/dns)
2. Go to DNS Management for hisrage.com
3. Add/Update the following records:

### A Record (for @ / root domain)
- Type: A
- Name: @
- Value: [IP address from flyctl certs create]
- TTL: 600

### AAAA Record (IPv6)
- Type: AAAA
- Name: @
- Value: [IPv6 address from flyctl certs create]
- TTL: 600

### CNAME Record (for www)
- Type: CNAME
- Name: www
- Value: hisrage.fly.dev
- TTL: 600

### Save all changes

DNS propagation can take 5-60 minutes.

## Step 10: Verify SSL Certificate

After DNS propagates, Fly.io will automatically issue SSL certificates:

```bash
flyctl certs show hisrage.com --app hisrage
```

Wait until the status shows "Ready".

## Step 11: Test Your Deployment

Visit your website:
- https://hisrage.com
- https://www.hisrage.com

Test the API:
```bash
curl https://hisrage.com/api/health
```

## Payment Gateway Setup

### Razorpay
1. Sign up at https://razorpay.com
2. Get API keys from Dashboard > Settings > API Keys
3. Update secrets with your keys
4. Configure webhook URL: `https://hisrage.com/api/payments/razorpay/webhook`

### Stripe
1. Sign up at https://stripe.com
2. Get API keys from Dashboard > Developers > API Keys
3. Update secrets with your keys
4. Configure webhook URL: `https://hisrage.com/api/payments/stripe/webhook`
5. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`

## Monitoring & Maintenance

### View Logs
```bash
flyctl logs --app hisrage
```

### Monitor App
```bash
flyctl status --app hisrage
```

### Scale Up (if needed)
```bash
flyctl scale vm shared-cpu-1x --app hisrage
flyctl scale memory 512 --app hisrage
```

### Database Backup
```bash
flyctl postgres backup list --app hisrage-db
```

## Troubleshooting

### App not responding
```bash
flyctl status --app hisrage
flyctl logs --app hisrage
```

### Database connection issues
```bash
flyctl postgres connect -a hisrage-db
```

### Check environment variables
```bash
flyctl secrets list --app hisrage
```

### Redeploy
```bash
flyctl deploy --app hisrage
```

## Cost Optimization

Fly.io offers generous free tier:
- Up to 3 shared-cpu-1x VMs (256MB RAM)
- 160GB outbound data transfer
- 3GB persistent volume storage

Your PostgreSQL database will cost approximately:
- $0.01/month for small workloads
- Scales as you grow

## Next Steps

1. Create admin account for product management
2. Add your products via admin API
3. Configure email notifications
4. Set up analytics (Google Analytics, etc.)
5. Connect to Instagram Shop
6. Launch marketing campaigns

## Support

- Fly.io Docs: https://fly.io/docs/
- Community Forum: https://community.fly.io/
- HisRage Support: info@hisrage.com

---

**You're ready to unleash the rage! 🔥**
