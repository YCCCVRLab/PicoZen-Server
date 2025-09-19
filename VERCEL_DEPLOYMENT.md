# 🚀 PicoZen Server - Vercel Deployment Guide

## Migration from Netlify to Vercel

This guide covers deploying the PicoZen VR App Store server on Vercel after migrating from Netlify.

## ✅ **Why Vercel?**

- **Generous Free Tier**: No credit limits like Netlify
- **No Sleep Mode**: Server stays active (unlike Render)
- **Fast Global CDN**: Better performance for VR apps
- **Automatic Scaling**: Handles traffic spikes seamlessly
- **GitHub Integration**: Auto-deploys on code changes

## 🚀 **Quick Deployment Steps**

### 1. **Connect to Vercel**

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account
3. Click **"New Project"**
4. Import `YCCCVRLab/PicoZen-Server` repository
5. Vercel will auto-detect the configuration from `vercel.json`

### 2. **Environment Variables**

In Vercel dashboard, add these environment variables:

```bash
NODE_ENV=production
DATABASE_PATH=/tmp/picozen.db
ADMIN_PASSWORD=yccc-vr-lab-2025
```

### 3. **Deploy**

Click **"Deploy"** - Vercel will:
- Install dependencies from `package.json`
- Build using the `vercel.json` configuration
- Deploy your server globally

## 🔧 **Configuration Details**

### **vercel.json Configuration**

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/admin(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### **Key Changes Made**

1. **Server Structure**: Modified `server.js` to work as Vercel serverless function
2. **Database**: Uses `/tmp/` directory for SQLite (recreated on cold starts)
3. **CORS**: Enhanced headers for VR app connectivity
4. **Error Handling**: Better handling for serverless cold starts
5. **File Serving**: Configured for Vercel's static file system

## 📱 **Update VR App Configuration**

After deployment, update the Android VR app to use your new Vercel URL:

### **In NetworkHelper.java:**
```java
public static final String DEFAULT_API_SERVER = "https://your-app.vercel.app";
```

### **Your New Server URLs:**
- **API Base**: `https://your-project-name.vercel.app`
- **Health Check**: `https://your-project-name.vercel.app/api/health`
- **Apps API**: `https://your-project-name.vercel.app/api/apps`
- **Admin Panel**: `https://your-project-name.vercel.app/admin`

## 🧪 **Testing Deployment**

### 1. **Health Check**
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "ok",
  "server": "PicoZen-Server-Vercel",
  "version": "1.0.1"
}
```

### 2. **Apps API**
```bash
curl https://your-app.vercel.app/api/apps
```

### 3. **VR App Test**
- Update VR app with new server URL
- Test "couldn't fetch files" issue should be resolved
- Verify file size calculations show correctly

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Database Not Initializing**
- **Symptom**: API returns database errors
- **Solution**: Database recreates on each cold start (this is normal for serverless)
- **Fix**: Use the admin panel to re-add apps after deployment

#### **2. VR App Can't Connect**
- **Symptom**: "Couldn't fetch files" error persists
- **Solution**: Check CORS headers and update VR app URL
- **Test**: Visit `/api/test` endpoint in browser

#### **3. File Uploads Not Working**
- **Symptom**: Admin panel file uploads fail
- **Solution**: Vercel has limited file system access
- **Alternative**: Use external storage (S3, Cloudinary) for production

#### **4. Cold Start Delays**
- **Symptom**: First request after inactivity is slow
- **Solution**: This is normal for serverless functions
- **Mitigation**: Use health check pings to keep warm

## 📊 **Performance Monitoring**

### **Vercel Analytics**
- Enable Analytics in Vercel dashboard
- Monitor response times and error rates
- Track VR app usage patterns

### **Health Monitoring**
Set up external monitoring:
```bash
# Ping every 5 minutes to prevent cold starts
curl https://your-app.vercel.app/api/health
```

## 🔐 **Security Considerations**

### **Environment Variables**
- Never commit passwords to Git
- Use Vercel's environment variable system
- Rotate admin passwords regularly

### **CORS Configuration**
- Currently allows all origins for VR compatibility
- Consider restricting in production if needed

## 🚀 **Next Steps**

1. **Deploy to Vercel** using this guide
2. **Update VR app** with new server URL
3. **Test connectivity** from VR headset
4. **Verify file size calculations** are fixed
5. **Add apps** through admin panel
6. **Monitor performance** through Vercel dashboard

## 📞 **Support**

- **GitHub Issues**: Report problems in the repository
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **YCCC VR Lab**: Room 112, Wells Campus

---

**🎯 Migration Complete!** Your PicoZen server is now running on Vercel with improved performance and reliability.