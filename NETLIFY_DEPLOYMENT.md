# 🚀 Deploy PicoZen Server to Netlify

This guide will help you deploy the PicoZen serverless API to Netlify for free cloud hosting.

## 📋 Prerequisites

- GitHub account (you already have this)
- Netlify account (free at [netlify.com](https://netlify.com))

## 🔧 Step 1: Prepare for Deployment

The PicoZen-Server repository is already configured for Netlify deployment with:
- ✅ **netlify.toml** - Configuration file
- ✅ **Serverless functions** - In `netlify/functions/`
- ✅ **CORS headers** - Properly configured
- ✅ **UbiSim app** - Already included in the API

## 🌐 Step 2: Deploy to Netlify

### Option A: Deploy via Netlify Dashboard (Recommended)

1. **Go to [netlify.com](https://netlify.com)** and sign up/login
2. **Click "Add new site"** → "Import an existing project"
3. **Connect to GitHub** and select `YCCCVRLab/PicoZen-Server`
4. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`
5. **Click "Deploy site"**

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Clone your repository
git clone https://github.com/YCCCVRLab/PicoZen-Server.git
cd PicoZen-Server

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

## 🔗 Step 3: Get Your API URL

After deployment, Netlify will give you a URL like:
- **https://amazing-app-name.netlify.app**

Your API endpoints will be:
- `https://your-site.netlify.app/api/apps`
- `https://your-site.netlify.app/api/categories`
- `https://your-site.netlify.app/api/featured`
- `https://your-site.netlify.app/api/download/1`

## 🔧 Step 4: Update Web Interface

Update the PicoZen-Web to use your new API:

1. **Edit `script.js`** in the PicoZen-Web repository
2. **Change the API_SERVER constant**:
   ```javascript
   const DEFAULT_API_SERVER = 'https://your-site.netlify.app/api';
   ```
3. **Commit and push** the changes

## ✅ Step 5: Test Your Deployment

Visit your Netlify site and test these endpoints:

### Test API Endpoints
```bash
# List apps
curl https://your-site.netlify.app/api/apps

# Get categories
curl https://your-site.netlify.app/api/categories

# Get featured apps
curl https://your-site.netlify.app/api/featured

# Download UbiSim (should redirect)
curl -I https://your-site.netlify.app/api/download/1
```

### Expected Responses

**GET /api/apps:**
```json
{
  "success": true,
  "apps": [
    {
      "id": 1,
      "title": "UbiSim",
      "developer": "UbiSim",
      "category": "Education",
      "description": "Immersive VR nursing simulation platform...",
      "downloadUrl": "/api/download/1",
      "iconUrl": "https://scontent-lga3-3.oculuscdn.com/...",
      "rating": 4.8,
      "downloadCount": 1250
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

## 🎯 Step 6: Configure Custom Domain (Optional)

1. **In Netlify Dashboard** → Site settings → Domain management
2. **Add custom domain**: `api.yourdomain.com`
3. **Configure DNS** with your domain provider:
   ```
   CNAME api.yourdomain.com your-site.netlify.app
   ```
4. **Enable HTTPS** (automatic with Netlify)

## 🔧 Adding More Apps

To add more apps to your store:

1. **Edit `netlify/functions/apps.js`**
2. **Add to the apps array**:
   ```javascript
   {
     id: 2,
     packageName: 'com.example.newapp',
     title: 'New VR App',
     developer: 'Developer Name',
     category: 'Games',
     description: 'App description...',
     downloadUrl: 'https://direct-download-url.com/app.apk',
     iconUrl: 'https://icon-url.com/icon.jpg',
     rating: 4.5,
     downloadCount: 500,
     featured: false
   }
   ```
3. **Commit and push** - Netlify will auto-deploy

## 📊 Monitoring & Analytics

### Netlify Analytics
- **View in Dashboard** → Analytics
- **Track API calls** and bandwidth usage
- **Monitor errors** in Functions logs

### Function Logs
```bash
# View live logs
netlify functions:logs

# Or check in Netlify Dashboard → Functions
```

## 🔒 Security Considerations

### Environment Variables
For sensitive data, use Netlify environment variables:

1. **Netlify Dashboard** → Site settings → Environment variables
2. **Add variables**:
   ```
   ADMIN_PASSWORD=your-secure-password
   API_SECRET=your-api-secret
   ```
3. **Access in functions**:
   ```javascript
   const adminPassword = process.env.ADMIN_PASSWORD;
   ```

### Rate Limiting
The current setup has no rate limiting. For production:
- Use Netlify's built-in DDoS protection
- Implement function-level rate limiting
- Consider Netlify Pro for advanced features

## 🚀 Advanced Features

### Database Integration
For persistent data, integrate with:
- **Netlify Blobs** (key-value storage)
- **FaunaDB** (serverless database)
- **Supabase** (PostgreSQL as a service)
- **Airtable** (spreadsheet database)

### File Uploads
For app uploads, use:
- **Netlify Forms** with file uploads
- **Cloudinary** for image processing
- **AWS S3** for file storage

## 🆘 Troubleshooting

### Common Issues

**Functions not working:**
```bash
# Check function logs
netlify functions:logs --name=apps

# Test locally
netlify dev
```

**CORS errors:**
- Check `netlify.toml` headers configuration
- Verify function CORS headers
- Test with different browsers

**Build failures:**
- Check Node.js version (needs 18+)
- Verify `package.json` dependencies
- Check build logs in Netlify Dashboard

### Getting Help
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Community Forum**: [community.netlify.com](https://community.netlify.com)
- **GitHub Issues**: Report bugs on the repository

## 🎉 Success!

Once deployed, you'll have:
- ✅ **Serverless API** running on Netlify
- ✅ **UbiSim app** available for download
- ✅ **CORS-enabled** endpoints for web interface
- ✅ **Auto-deployment** from GitHub
- ✅ **Free hosting** with generous limits

Your PicoZen VR app store is now live in the cloud! 🥽✨