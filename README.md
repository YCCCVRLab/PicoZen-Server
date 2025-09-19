# PicoZen Server - Complete App Store Backend

A complete backend server implementation for the PicoZen VR app store ecosystem, providing API endpoints for app metadata, downloads, and store functionality.

## 🏗️ Architecture Overview

This server recreates the original PicoZen app store functionality:

- **App Database** - Store app metadata, descriptions, screenshots, download URLs
- **REST API** - Endpoints for app browsing, searching, and downloading
- **Image Hosting** - Serve app screenshots and icons
- **Download Management** - Handle APK file downloads and statistics
- **Admin Interface** - Web UI for managing the app catalog

## 🚀 Features

### Core Functionality
- ✅ **App Catalog Management** - Add, edit, remove VR apps
- ✅ **Metadata Storage** - Titles, descriptions, categories, ratings
- ✅ **Image Hosting** - Screenshots, icons, promotional images
- ✅ **Download Tracking** - Statistics and analytics
- ✅ **Search & Filter** - Find apps by category, rating, etc.

### API Endpoints
- `GET /api/apps` - List all apps with pagination
- `GET /api/apps/:id` - Get detailed app information
- `GET /api/apps/search` - Search apps by query
- `GET /api/apps/category/:category` - Filter by category
- `GET /api/download/:id` - Download APK file
- `POST /api/admin/apps` - Add new app (admin)
- `PUT /api/admin/apps/:id` - Update app (admin)
- `DELETE /api/admin/apps/:id` - Remove app (admin)

### Web Interfaces
- **Public Store** - Browse apps like the original PicoZen
- **Admin Panel** - Manage app catalog
- **Analytics Dashboard** - Download stats and metrics

## 🛠️ Technology Stack

- **Backend:** Node.js + Express.js
- **Database:** SQLite (for simplicity) or PostgreSQL (for production)
- **File Storage:** Local filesystem or S3-compatible storage
- **Frontend:** HTML/CSS/JS (matching PicoZen design)
- **Deployment:** Docker + Docker Compose

## 📱 Integration

### VR Headset App (PicoZen Android)
- Connects to server API to browse apps
- Downloads APKs directly from server
- Displays app store interface in VR

### Web Interface (PicoZen-Web)
- Browse app store from desktop/mobile
- Same data as VR app, responsive design
- Admin tools for managing catalog

### Sideloading Tools
- Maintains original file browsing functionality
- Adds app store integration
- Seamless switching between modes

## 🗄️ Database Schema

```sql
-- Apps table
CREATE TABLE apps (
    id INTEGER PRIMARY KEY,
    package_name VARCHAR(255) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    short_description VARCHAR(500),
    version VARCHAR(50),
    version_code INTEGER,
    category VARCHAR(100),
    developer VARCHAR(255),
    rating DECIMAL(2,1),
    download_count INTEGER DEFAULT 0,
    file_size BIGINT,
    download_url VARCHAR(500),
    icon_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Screenshots table
CREATE TABLE screenshots (
    id INTEGER PRIMARY KEY,
    app_id INTEGER REFERENCES apps(id),
    image_url VARCHAR(500),
    caption TEXT,
    display_order INTEGER
);

-- Categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    icon_url VARCHAR(500)
);

-- Download logs
CREATE TABLE downloads (
    id INTEGER PRIMARY KEY,
    app_id INTEGER REFERENCES apps(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Quick Start

### Development Setup
```bash
# Clone the repository
git clone https://github.com/YCCCVRLab/PicoZen-Server.git
cd PicoZen-Server

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:init

# Start development server
npm run dev
```

### Production Deployment
```bash
# Using Docker
docker-compose up -d

# Or manual deployment
npm run build
npm start
```

## 📊 Admin Interface

Access the admin panel at `/admin` to:
- Add new VR apps to the store
- Upload screenshots and icons
- Manage categories and tags
- View download statistics
- Moderate user reviews

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=sqlite:./data/picozen.db
# DATABASE_URL=postgresql://user:pass@localhost/picozen

# File Storage
STORAGE_TYPE=local
# STORAGE_TYPE=s3
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=500MB

# Security
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password

# External Services
CDN_BASE_URL=https://cdn.yourdomain.com
```

### Categories
The system supports these VR app categories:
- **Games** - VR games and entertainment
- **Education** - Learning and training apps
- **Productivity** - Work and utility apps
- **Social** - Communication and social VR
- **Health & Fitness** - Exercise and wellness
- **Entertainment** - Media and video apps
- **Tools** - System utilities and tools

## 🔗 API Documentation

### Get Apps List
```http
GET /api/apps?page=1&limit=20&category=games&sort=downloads
```

### App Object Structure
```json
{
  "id": 1,
  "packageName": "com.example.vrgame",
  "title": "Amazing VR Game",
  "description": "Full description...",
  "shortDescription": "Brief description",
  "version": "1.2.0",
  "versionCode": 120,
  "category": "games",
  "developer": "VR Studios",
  "rating": 4.5,
  "downloadCount": 15420,
  "fileSize": 157286400,
  "downloadUrl": "/api/download/1",
  "iconUrl": "/images/apps/1/icon.png",
  "screenshots": [
    {
      "url": "/images/apps/1/screenshot1.jpg",
      "caption": "Gameplay screenshot"
    }
  ],
  "createdAt": "2025-09-19T10:00:00Z",
  "updatedAt": "2025-09-19T12:00:00Z"
}
```

## 📝 License

GPL-3.0 - Same as original PicoZen project

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🔗 Related Projects

- [PicoZen-Web](https://github.com/YCCCVRLab/PicoZen-Web) - Web interface
- [PicoZen](https://github.com/YCCCVRLab/PicoZen) - Android VR app
- [Original PicoZen](https://github.com/barnabwhy/PicoZen) - Original project

---

**YCCC VR Lab** | Room 112, Wells Campus | Building the Future of VR Education