# 🚀 Complete PicoZen Ecosystem Deployment Guide

This guide will help you set up the complete PicoZen app store ecosystem, recreating the original functionality with your own apps and server.

## 📋 Overview

The complete PicoZen ecosystem consists of:

1. **PicoZen-Server** - Backend API and app store database
2. **PicoZen-Web** - Web interface for browsing apps
3. **PicoZen Android App** - VR headset app for browsing and downloading
4. **Admin Panel** - Web interface for managing your app catalog

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   VR Headset    │    │   Web Browser   │    │  Admin Panel    │
│  (Android App)  │    │  (Store UI)     │    │ (Management)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      PicoZen Server         │
                    │   (API + File Storage)      │
                    └─────────────────────────────┘
```

## 🛠️ Step 1: Deploy the Server

### Option A: Quick Docker Deployment (Recommended)

```bash
# Clone the server repository
git clone https://github.com/YCCCVRLab/PicoZen-Server.git
cd PicoZen-Server

# Create environment file
cp .env.example .env

# Edit the environment file
nano .env

# Set your admin password and other settings
ADMIN_PASSWORD=your_secure_password_here
NODE_ENV=production

# Start the server
docker-compose up -d

# The server will be available at http://localhost:3000
```

### Option B: Manual Installation

```bash
# Prerequisites: Node.js 16+, npm 8+
git clone https://github.com/YCCCVRLab/PicoZen-Server.git
cd PicoZen-Server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env

# Initialize database
npm run db:init

# Start the server
npm start
```

### Server Configuration

Edit your `.env` file:

```env
# Server settings
PORT=3000
NODE_ENV=production
ADMIN_PASSWORD=your_secure_admin_password

# Database (SQLite by default)
DATABASE_PATH=./data/picozen.db

# File storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=500MB

# Security
JWT_SECRET=your-super-secret-jwt-key

# CORS (add your domain)
CORS_ORIGINS=https://ycccrlab.github.io,https://your-domain.com
```

## 📱 Step 2: Set Up the Web Interface

The web interface is already deployed at:
**https://ycccrlab.github.io/PicoZen-Web/store.html**

To customize it for your server:

1. **Update API endpoint** in `store.html`:
   ```javascript
   const API_BASE = 'https://your-server-domain.com/api';
   ```

2. **Deploy to your own domain** (optional):
   ```bash
   git clone https://github.com/YCCCVRLab/PicoZen-Web.git
   # Edit store.html with your server URL
   # Deploy to your web hosting service
   ```

## 🥽 Step 3: Configure the Android App

### Modify the PicoZen Android App

1. **Clone the app repository**:
   ```bash
   git clone https://github.com/YCCCVRLab/PicoZen.git
   ```

2. **Update server endpoints** in the app code to point to your server

3. **Build and sideload** to your VR headsets

### Alternative: Use Existing Sideloading

If you want to start with just web functionality:
- Use the existing sideloading features
- Add your APK files to the server
- Users can download via web interface and install manually

## 📊 Step 4: Add Your Apps

### Access the Admin Panel

1. Go to `http://your-server:3000/admin`
2. Login with your admin password
3. Start adding apps!

### Adding Apps via Admin Panel

For each app you want to add:

1. **Required Information**:
   - App title
   - Package name (e.g., `com.company.appname`)
   - Developer name
   - Category
   - Description

2. **Upload Files**:
   - APK file (the actual app)
   - App icon (512x512 PNG recommended)
   - Screenshots (optional)

3. **Additional Metadata**:
   - Version information
   - Short description
   - Featured status

### Bulk Import (Advanced)

For many apps, you can directly insert into the database:

```sql
INSERT INTO apps (
    package_name, title, description, short_description, 
    version, category, developer, download_url, icon_url
) VALUES (
    'com.example.vrgame',
    'Amazing VR Game',
    'Full description of the game...',
    'Brief description',
    '1.0.0',
    'Games',
    'VR Studios',
    '/files/amazing_vr_game.apk',
    '/images/icons/amazing_vr_game_icon.png'
);
```

## 🌐 Step 5: Configure Your Domain

### DNS Setup

Point your domain to your server:
```
A    api.yourdomain.com    → Your.Server.IP.Address
A    store.yourdomain.com  → Your.Server.IP.Address (or GitHub Pages)
```

### SSL Certificate (Production)

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot
sudo certbot --nginx -d api.yourdomain.com
```

### Nginx Configuration (Optional)

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔧 Step 6: Customize and Brand

### Update Branding

1. **Web Interface**: Edit `store.html`
   - Change logo and colors
   - Update header text
   - Modify footer information

2. **Server**: Edit server responses
   - Update API response metadata
   - Customize admin panel branding

3. **Android App**: Modify app resources
   - Update app icon and name
   - Change color scheme
   - Update about/credits screens

### Add Custom Categories

```sql
INSERT INTO categories (name, description, icon_url, display_order) VALUES
('Educational VR', 'Learning and training applications', '/images/categories/education.png', 1),
('Medical Training', 'Healthcare simulation apps', '/images/categories/medical.png', 2),
('Architecture', 'Building and design visualization', '/images/categories/architecture.png', 3);
```

## 📈 Step 7: Monitor and Maintain

### View Statistics

- Access `/admin` for app statistics
- Monitor download counts
- Track popular categories

### Database Backup

```bash
# SQLite backup
cp ./data/picozen.db ./backups/picozen_$(date +%Y%m%d).db

# Automated backup script
echo "0 2 * * * cp /path/to/data/picozen.db /path/to/backups/picozen_\$(date +\%Y\%m\%d).db" | crontab -
```

### Log Monitoring

```bash
# View server logs
docker-compose logs -f picozen-server

# Or for manual installation
tail -f server.log
```

## 🔒 Security Considerations

### Production Security

1. **Change default passwords**:
   ```env
   ADMIN_PASSWORD=very_secure_password_here
   JWT_SECRET=random_long_string_here
   ```

2. **Enable HTTPS** for all connections

3. **Firewall configuration**:
   ```bash
   # Only allow necessary ports
   ufw allow 22    # SSH
   ufw allow 80    # HTTP
   ufw allow 443   # HTTPS
   ufw enable
   ```

4. **Regular updates**:
   ```bash
   # Update server dependencies
   npm audit fix
   
   # Update system packages
   sudo apt update && sudo apt upgrade
   ```

### File Security

- Store APK files securely
- Validate uploaded files
- Implement rate limiting
- Monitor for suspicious activity

## 🚀 Going Live Checklist

- [ ] Server deployed and accessible
- [ ] Database initialized with categories
- [ ] Admin panel working
- [ ] Web interface pointing to correct API
- [ ] Test app upload and download
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Security hardening complete

## 🆘 Troubleshooting

### Common Issues

**Server won't start**:
```bash
# Check logs
docker-compose logs picozen-server

# Check port availability
netstat -tulpn | grep :3000
```

**Apps not loading**:
- Check API endpoint in web interface
- Verify CORS settings
- Check network connectivity

**File uploads failing**:
- Check disk space: `df -h`
- Verify upload directory permissions
- Check file size limits

**Database errors**:
```bash
# Reset database (WARNING: loses all data)
rm ./data/picozen.db
npm run db:init
```

### Getting Help

- **GitHub Issues**: Report bugs on respective repositories
- **Discord**: Join the PicoZen community
- **Documentation**: Check the README files for each component

## 🎯 Success Metrics

Your PicoZen ecosystem is successful when:

- ✅ Users can browse apps on web and VR
- ✅ Downloads work reliably
- ✅ Admin can easily add new apps
- ✅ Server handles expected load
- ✅ Students/users adopt the platform

---

**Congratulations!** 🎉 You now have a complete VR app store ecosystem just like the original PicoZen, but hosted and managed by you for your educational institution or organization.

For advanced customization and enterprise features, consider contributing to the open-source project or reaching out to the YCCC VR Lab team.