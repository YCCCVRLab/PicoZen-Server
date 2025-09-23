const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

// Database configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/picozen.db');
const DB_DIR = path.dirname(DB_PATH);

let db = null;

// Database schema
const SCHEMA = {
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      icon_url VARCHAR(500),
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  apps: `
    CREATE TABLE IF NOT EXISTS apps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_name VARCHAR(255) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      short_description VARCHAR(500),
      version VARCHAR(50),
      version_code INTEGER,
      category VARCHAR(100),
      category_name VARCHAR(100),
      developer VARCHAR(255),
      rating DECIMAL(2,1) DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      file_size BIGINT,
      download_url VARCHAR(500),
      icon_url VARCHAR(500),
      featured INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  downloads: `
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES apps(id),
      ip_address VARCHAR(45),
      user_agent TEXT,
      downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  screenshots: `
    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id INTEGER REFERENCES apps(id),
      image_url VARCHAR(500),
      caption TEXT,
      display_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `
};

// Sample data for fallback
const SAMPLE_APPS = [
  {
    id: 1,
    package_name: "com.ubisim.player",
    title: "UbiSim",
    description: "UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.",
    short_description: "Immersive VR nursing simulation platform for clinical training and skill development",
    version: "1.18.0.157",
    version_code: 118000157,
    category: "Education",
    category_name: "Education",
    developer: "UbiSim",
    rating: 4.8,
    download_count: 1250,
    file_size: 157286400,
    download_url: "https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk",
    icon_url: "https://scontent-lga3-3.oculuscdn.com/v/t64.5771-25/57570314_1220899138305712_3549230735456268391_n.jpg",
    featured: 1,
    active: 1,
    tags: "nursing,medical,training,simulation,healthcare,education",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    package_name: "com.ycccrlab.demo",
    title: "YCCC VR Demo",
    description: "A demonstration VR application showcasing the capabilities of the PicoZen app store system. Features immersive environments and interactive elements designed for educational purposes.",
    short_description: "Educational VR demonstration app for YCCC VR Lab",
    version: "1.0.0",
    version_code: 10000,
    category: "Education",
    category_name: "Education",
    developer: "YCCC VR Lab",
    rating: 4.8,
    download_count: 120,
    file_size: 75497472,
    download_url: "/apps/ycccdemo.apk",
    icon_url: "https://via.placeholder.com/512x512/4A90E2/FFFFFF?text=YCCC+VR",
    featured: 1,
    active: 1,
    tags: "demo,yccc,vr lab,education,showcase",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    package_name: "com.example.vrgame",
    title: "Sample VR Game",
    description: "An exciting virtual reality adventure game that takes you through immersive worlds and challenging puzzles. Experience the future of gaming with cutting-edge VR technology.",
    short_description: "An exciting VR adventure game",
    version: "2.1.0",
    version_code: 21000,
    category: "Games",
    category_name: "Games",
    developer: "VR Studios",
    rating: 4.5,
    download_count: 2500,
    file_size: 250000000,
    download_url: "/apps/vrgame.apk",
    icon_url: "",
    featured: 0,
    active: 1,
    tags: "game,adventure,vr,entertainment",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const SAMPLE_CATEGORIES = [
  {
    id: 1,
    name: "Education",
    description: "Educational and training applications for VR learning",
    icon_url: "🎓",
    display_order: 1
  },
  {
    id: 2,
    name: "Games", 
    description: "VR games and interactive experiences",
    icon_url: "🎮",
    display_order: 2
  },
  {
    id: 3,
    name: "Entertainment",
    description: "Creative and artistic VR applications",
    icon_url: "🎨",
    display_order: 3
  },
  {
    id: 4,
    name: "Productivity",
    description: "Collaboration and productivity tools for VR",
    icon_url: "💼",
    display_order: 4
  }
];

// Database helper functions
const dbHelpers = {
  // Get apps with pagination and filtering
  async getApps(page = 1, limit = 20, category = null, search = null) {
    try {
      if (!db) {
        console.log('No database connection, using sample data');
        let apps = [...SAMPLE_APPS];
        
        // Apply category filter
        if (category && category.toLowerCase() !== 'all') {
          apps = apps.filter(app => 
            app.category.toLowerCase() === category.toLowerCase() ||
            app.category_name.toLowerCase() === category.toLowerCase()
          );
        }
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          apps = apps.filter(app =>
            app.title.toLowerCase().includes(searchLower) ||
            app.description.toLowerCase().includes(searchLower) ||
            app.developer.toLowerCase().includes(searchLower) ||
            (app.tags && app.tags.toLowerCase().includes(searchLower))
          );
        }
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const paginatedApps = apps.slice(offset, offset + limit);
        
        return {
          apps: paginatedApps,
          pagination: {
            page: page,
            limit: limit,
            total: apps.length,
            pages: Math.ceil(apps.length / limit)
          }
        };
      }
      
      // Database query logic here
      return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM apps WHERE active = 1';
        let params = [];
        
        if (category && category.toLowerCase() !== 'all') {
          query += ' AND (category = ? OR category_name = ?)';
          params.push(category, category);
        }
        
        if (search) {
          query += ' AND (title LIKE ? OR description LIKE ? OR developer LIKE ? OR tags LIKE ?)';
          const searchPattern = `%${search}%`;
          params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        
        // Count total first
        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        db.get(countQuery, params, (err, countResult) => {
          if (err) return reject(err);
          
          const total = countResult.total;
          const offset = (page - 1) * limit;
          
          // Get paginated results
          query += ' ORDER BY featured DESC, download_count DESC LIMIT ? OFFSET ?';
          params.push(limit, offset);
          
          db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            
            resolve({
              apps: rows,
              pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
              }
            });
          });
        });
      });
    } catch (error) {
      console.error('Error in getApps:', error);
      // Return sample data on error
      return {
        apps: SAMPLE_APPS,
        pagination: { page: 1, limit: 20, total: SAMPLE_APPS.length, pages: 1 }
      };
    }
  },

  // Get single app by ID
  async getApp(id) {
    try {
      if (!db) {
        return SAMPLE_APPS.find(app => app.id == id);
      }
      
      return new Promise((resolve, reject) => {
        db.get('SELECT * FROM apps WHERE id = ? AND active = 1', [id], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
    } catch (error) {
      console.error('Error in getApp:', error);
      return SAMPLE_APPS.find(app => app.id == id);
    }
  },

  // Get categories
  async getCategories() {
    try {
      if (!db) {
        return SAMPLE_CATEGORIES;
      }
      
      return new Promise((resolve, reject) => {
        db.all('SELECT * FROM categories ORDER BY display_order ASC', [], (err, rows) => {
          if (err) return reject(err);
          resolve(rows || SAMPLE_CATEGORIES);
        });
      });
    } catch (error) {
      console.error('Error in getCategories:', error);
      return SAMPLE_CATEGORIES;
    }
  },

  // Create new app
  async createApp(appData) {
    if (!db) {
      throw new Error('Database not available');
    }
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO apps (
          package_name, title, description, short_description, version, version_code,
          category, category_name, developer, rating, download_count, file_size,
          download_url, icon_url, featured, active, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        appData.package_name,
        appData.title,
        appData.description,
        appData.short_description,
        appData.version,
        appData.version_code,
        appData.category,
        appData.category_name,
        appData.developer,
        appData.rating,
        appData.download_count,
        appData.file_size,
        appData.download_url,
        appData.icon_url,
        appData.featured,
        appData.active,
        appData.tags
      ];
      
      db.run(query, params, function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...appData });
      });
    });
  },

  // Create category
  async createCategory(categoryData) {
    if (!db) {
      throw new Error('Database not available');
    }
    
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO categories (name, description, icon_url, display_order)
        VALUES (?, ?, ?, ?)
      `;
      
      const params = [
        categoryData.name,
        categoryData.description,
        categoryData.iconUrl || categoryData.icon_url,
        categoryData.displayOrder || categoryData.display_order || 0
      ];
      
      db.run(query, params, function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...categoryData });
      });
    });
  },

  // Record download
  async recordDownload(appId, ipAddress, userAgent) {
    if (!db) {
      console.log('Database not available, skipping download record');
      return;
    }
    
    return new Promise((resolve, reject) => {
      const query = 'INSERT INTO downloads (app_id, ip_address, user_agent) VALUES (?, ?, ?)';
      db.run(query, [appId, ipAddress, userAgent], function(err) {
        if (err) return reject(err);
        
        // Update download count
        db.run('UPDATE apps SET download_count = download_count + 1 WHERE id = ?', [appId], (updateErr) => {
          if (updateErr) console.error('Error updating download count:', updateErr);
          resolve({ id: this.lastID });
        });
      });
    });
  }
};

// Initialize database
async function initDatabase() {
  try {
    // Ensure data directory exists
    await fs.mkdir(DB_DIR, { recursive: true });
    
    return new Promise((resolve, reject) => {
      db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          db = null;
          resolve(false); // Don't reject, just indicate failure
          return;
        }
        
        console.log('📁 Connected to SQLite database:', DB_PATH);
        
        // Create tables
        const tables = Object.keys(SCHEMA);
        let completed = 0;
        
        tables.forEach(tableName => {
          db.run(SCHEMA[tableName], (err) => {
            if (err) {
              console.error(`Error creating table ${tableName}:`, err);
            } else {
              console.log(`✅ Table ${tableName} ready`);
            }
            
            completed++;
            if (completed === tables.length) {
              // Insert sample data if tables are empty
              insertSampleData().then(() => {
                resolve(true);
              }).catch((sampleErr) => {
                console.warn('Error inserting sample data:', sampleErr);
                resolve(true); // Still resolve as database is functional
              });
            }
          });
        });
      });
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

// Insert sample data if needed
async function insertSampleData() {
  if (!db) return;
  
  try {
    // Check if we have any apps
    const appCount = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM apps', [], (err, row) => {
        resolve(err ? 0 : row.count);
      });
    });
    
    if (appCount === 0) {
      console.log('📱 Inserting sample apps...');
      for (const app of SAMPLE_APPS) {
        await dbHelpers.createApp(app).catch(console.error);
      }
    }
    
    // Check if we have any categories
    const categoryCount = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as count FROM categories', [], (err, row) => {
        resolve(err ? 0 : row.count);
      });
    });
    
    if (categoryCount === 0) {
      console.log('📂 Inserting sample categories...');
      for (const category of SAMPLE_CATEGORIES) {
        await dbHelpers.createCategory(category).catch(console.error);
      }
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

// Get database instance
function getDB() {
  return db;
}

module.exports = {
  initDatabase,
  getDB,
  dbHelpers
};