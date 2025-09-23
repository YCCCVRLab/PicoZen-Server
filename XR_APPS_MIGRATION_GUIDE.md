# 🚀 XR Apps Migration & Deployment Guide

This guide explains how to migrate apps from your XRDirectory to PicoZen-Server and deploy the enhanced server with a comprehensive VR app catalog.

## 🎯 What's Been Added

### ✅ **Comprehensive VR App Database**
I've added **17 educational VR applications** to your PicoZen-Server, including:

**🎓 Educational Apps:**
- **UbiSim** - VR nursing simulation platform
- **Apollo 11 VR** - Space exploration experience  
- **Labster VR** - Virtual science laboratories
- **Google Earth VR** - World exploration
- **3D Organon VR Anatomy** - Human anatomy atlas
- **Mondly VR** - Language learning
- **Google Expeditions** - Virtual field trips
- **Nanome** - Molecular visualization
- **Titanic VR** - Historical experience

**🎨 Creative Tools:**
- **Tilt Brush** - 3D painting
- **Medium** - 3D sculpting
- **Mozilla Hubs** - Virtual world creation
- **Horizon Worlds** - Social VR building

**💼 Productivity:**
- **Microsoft Mesh** - VR collaboration

**🏫 YCCC VR Lab Custom Apps:**
- **YCCC VR Demo** - Lab showcase app
- **VR Training Simulator** - Multi-purpose training

### ✅ **Database Infrastructure**
- **SQLite Database** with proper schema
- **App Management** with categories, ratings, downloads
- **Migration Scripts** for easy data population
- **Admin Interface** for management

### ✅ **Enhanced API**
- **Robust CORS handling** (fixes GitHub Pages issues)
- **Fallback systems** (works even if database fails)
- **Proper data formatting** matching frontend expectations
- **Enhanced error handling**

## 🚀 Deployment Steps

### **Step 1: Redeploy Koyeb Server**

1. **Go to your Koyeb dashboard**: https://app.koyeb.com/
2. **Find your service**: `picozen-server`
3. **Click "Redeploy"** (green button) - this will pull the latest code
4. **Wait for deployment** (1-2 minutes)

### **Step 2: Initialize Database & Migrate Apps**

Once deployed, visit your server admin panel:
```
https://above-odella-john-barr-40e8cdf4.koyeb.app/admin
```

Click **"🔄 Run Migration"** to populate the database with all XR apps.

### **Step 3: Verify Everything Works**

Test the endpoints:
- **Apps API**: https://above-odella-john-barr-40e8cdf4.koyeb.app/apps
- **Categories**: https://above-odella-john-barr-40e8cdf4.koyeb.app/categories  
- **Health Check**: https://above-odella-john-barr-40e8cdf4.koyeb.app/health

### **Step 4: Test Frontend Connection**

Visit your frontend and verify it loads real data:
- **Main App**: https://ycccrlab.github.io/PicoZen-Web/
- **Connection Test**: https://ycccrlab.github.io/PicoZen-Web/test-connection.html

## 📱 Apps Included

### **Educational VR Applications**

| App Name | Developer | Category | Description |
|----------|-----------|----------|-------------|
| **UbiSim** | UbiSim | Education | VR nursing simulation platform |
| **Apollo 11 VR** | Immersive VR Education | Education | Moon landing experience |
| **Labster VR** | Labster | Education | Virtual science labs |
| **Google Earth VR** | Google | Education | World exploration |
| **3D Organon VR Anatomy** | 3D Organon | Education | Human anatomy atlas |
| **Mondly VR** | ATi Studios | Education | Language learning |
| **Google Expeditions** | Google for Education | Education | Virtual field trips |
| **Nanome** | Nanome Inc. | Education | Molecular visualization |
| **Titanic VR** | Timelooper | Education | Historical recreation |

### **Creative & Development Tools**

| App Name | Developer | Category | Description |
|----------|-----------|----------|-------------|
| **Tilt Brush** | Google | Entertainment | 3D painting in VR |
| **Medium** | Meta | Entertainment | 3D sculpting tool |
| **Mozilla Hubs** | Mozilla | Productivity | Virtual world creation |
| **Horizon Worlds** | Meta | Social | Social VR building |

### **YCCC VR Lab Custom Apps**

| App Name | Developer | Category | Description |
|----------|-----------|----------|-------------|
| **YCCC VR Demo** | YCCC VR Lab | Education | Lab showcase application |
| **VR Training Simulator** | YCCC VR Lab | Education | Multi-purpose training |

## 🔧 Manual Migration (Alternative)

If automatic migration doesn't work, you can run it manually:

1. **SSH into your server** (if possible)
2. **Run migration script**:
   ```bash
   npm run migrate
   ```

Or trigger via API:
```bash
curl -X GET https://above-odella-john-barr-40e8cdf4.koyeb.app/admin/migrate
```

## 🎯 Expected Results

After successful deployment and migration:

### ✅ **Frontend (PicoZen-Web)**
- ✅ No CORS errors in browser console
- ✅ Real server data loads (17+ apps)
- ✅ Category filtering works
- ✅ App details display properly
- ✅ Download buttons functional

### ✅ **Backend (PicoZen-Server)**  
- ✅ SQLite database with 17+ apps
- ✅ 6 categories (Education, Games, etc.)
- ✅ Proper API responses
- ✅ Admin panel functional
- ✅ CORS headers working

### ✅ **API Endpoints**
```json
GET /apps - Returns all VR apps
GET /categories - Returns app categories  
GET /apps?category=Education - Filter by category
GET /admin - Admin management panel
GET /admin/migrate - Run migration
```

## 🛠️ Troubleshooting

### **Issue: Migration Fails**
**Solution**: Check server logs in Koyeb dashboard, ensure SQLite3 is installed

### **Issue: Apps Don't Load**
**Solution**: 
1. Check `/api/apps` endpoint directly
2. Verify CORS headers in browser network tab
3. Run connection test page

### **Issue: Database Errors**
**Solution**: 
1. Server falls back to sample data automatically
2. Migration creates database structure
3. Check file permissions for SQLite

## 📊 Database Schema

The migration creates these tables:

```sql
-- Apps table
CREATE TABLE apps (
  id INTEGER PRIMARY KEY,
  package_name VARCHAR(255) UNIQUE,
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100),
  developer VARCHAR(255),
  rating DECIMAL(2,1),
  download_count INTEGER,
  file_size BIGINT,
  download_url VARCHAR(500),
  icon_url VARCHAR(500),
  featured INTEGER,
  created_at DATETIME
);

-- Categories table  
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  description TEXT,
  icon_url VARCHAR(500),
  display_order INTEGER
);

-- Downloads tracking
CREATE TABLE downloads (
  id INTEGER PRIMARY KEY,
  app_id INTEGER,
  ip_address VARCHAR(45),
  downloaded_at DATETIME
);
```

## 🎉 Success Indicators

When everything is working correctly:

1. **✅ Admin Panel**: Shows 17+ apps and 6 categories
2. **✅ API Responses**: JSON data with proper structure
3. **✅ Frontend Loading**: Apps display without CORS errors
4. **✅ Category Filtering**: Education, Games, etc. work
5. **✅ App Details**: Proper descriptions, ratings, developers
6. **✅ Download Tracking**: Statistics update properly

## 🔄 Future Updates

To add more apps in the future:

1. **Edit** `scripts/migrate-xr-apps.js`
2. **Add new app objects** to the `xrApps` array
3. **Redeploy** and run migration
4. **Or use admin API** to add apps programmatically

## 📞 Support

If you encounter issues:

1. **Check Koyeb logs** in the dashboard
2. **Test API endpoints** directly in browser
3. **Run connection test** page for diagnostics
4. **Verify database** via admin panel

The migration includes comprehensive educational VR applications perfect for the YCCC VR Lab, with proper categorization, metadata, and download tracking! 🎓🥽