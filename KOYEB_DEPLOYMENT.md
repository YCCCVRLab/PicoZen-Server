# Koyeb Deployment Guide for PicoZen Server

## Overview
This guide will help you deploy your PicoZen VR App Store backend to Koyeb for free using their Docker support.

## Prerequisites
- GitHub account with PicoZen-Server repository
- Koyeb account (free)
- Free PostgreSQL database (Supabase or Neon)

## Step 1: Set up Free PostgreSQL Database

### Option A: Supabase (Recommended)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy the connection string (looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)

### Option B: Neon
1. Go to [neon.tech](https://neon.tech)
2. Create new database
3. Copy the connection string

## Step 2: Deploy to Koyeb

### 2.1 Create Koyeb Account
1. Go to [koyeb.com](https://koyeb.com)
2. Sign up with GitHub
3. Verify your account

### 2.2 Deploy from GitHub
1. In Koyeb dashboard, click **"Create App"**
2. Select **"GitHub"** as source
3. Choose your **PicoZen-Server** repository
4. Select **"Docker"** as build method

### 2.3 Configure Environment Variables
In the deployment settings, add these environment variables:

```bash
# Required
NODE_ENV=production
PORT=8000
POSTGRES_URL=your_database_connection_string_here

# Optional
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=*
```

### 2.4 Configure Service Settings
- **Name:** `picozen-server`
- **Region:** Choose closest to your users
- **Instance Type:** Free tier (Nano)
- **Port:** 8000
- **Health Check Path:** `/api/health`

### 2.5 Deploy
1. Click **"Deploy"**
2. Wait for build and deployment (3-5 minutes)
3. Get your app URL: `https://your-app-name-your-org.koyeb.app`

## Step 3: Test Deployment

### Test Endpoints
Once deployed, test these URLs:

```bash
# Health check
https://your-app-name-your-org.koyeb.app/api/health

# Apps list
https://your-app-name-your-org.koyeb.app/api/apps

# Categories
https://your-app-name-your-org.koyeb.app/api/categories

# Web interface
https://your-app-name-your-org.koyeb.app/store

# Admin panel
https://your-app-name-your-org.koyeb.app/admin
```

## Step 4: Configure Custom Domain (Optional)

1. In Koyeb dashboard, go to your app
2. Click **"Domains"** tab
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check your POSTGRES_URL format:
postgresql://username:password@host:port/database?sslmode=require
```

#### 2. Port Issues
- Koyeb uses PORT environment variable
- Make sure your app listens on `process.env.PORT || 8000`

#### 3. Build Failures
- Check Dockerfile syntax
- Ensure all dependencies are in package.json

#### 4. SSL Certificate Issues
- Add to environment variables: `NODE_TLS_REJECT_UNAUTHORIZED=0`
- Or use `sslmode=disable` in database URL

### Logs and Debugging
1. In Koyeb dashboard, go to your app
2. Click **"Logs"** tab
3. Check for error messages

## Koyeb Free Tier Limits

- **Services:** 2 apps maximum
- **Sleep:** Apps sleep after inactivity
- **Wake time:** ~10-30 seconds
- **Bandwidth:** Reasonable limits for development
- **Build time:** Up to 10 minutes

## Environment Variables Reference

### Required
```bash
NODE_ENV=production
PORT=8000
POSTGRES_URL=postgresql://user:pass@host:port/db
```

### Optional
```bash
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
CORS_ORIGINS=*
MAX_FILE_SIZE=50MB
UPLOAD_DIR=/app/uploads
```

## Database Schema Setup

Your app will automatically create the required tables on first run:
- `apps` - VR applications
- `categories` - App categories  
- `screenshots` - App images
- `downloads` - Download tracking

## Updating Your Deployment

### Automatic Updates
- Push changes to your GitHub repository
- Koyeb will automatically rebuild and redeploy

### Manual Redeploy
1. Go to Koyeb dashboard
2. Select your app
3. Click **"Redeploy"**

## Cost Considerations

### Free Tier
- 2 services (perfect for app + database)
- Sleeps after inactivity (wakes in ~30 seconds)
- Good for development and testing

### Paid Tier ($5+/month)
- No sleeping
- Better performance
- More services

## Security Best Practices

1. **Environment Variables:** Never commit secrets to GitHub
2. **Admin Password:** Use a strong password
3. **JWT Secret:** Generate a secure random string
4. **CORS:** Restrict origins in production
5. **Database:** Use SSL connections

## Support

- **Koyeb Docs:** [koyeb.com/docs](https://koyeb.com/docs)
- **GitHub Issues:** Report issues in your repository
- **Community:** Koyeb Discord/Forum

---

**Ready to Deploy?** Follow the steps above and your PicoZen VR App Store will be live on Koyeb in minutes!