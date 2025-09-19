const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

// Database schema
const schema = {
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
            developer VARCHAR(255),
            rating DECIMAL(2,1) DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            file_size BIGINT,
            download_url VARCHAR(500),
            icon_url VARCHAR(500),
            featured BOOLEAN DEFAULT FALSE,
            active BOOLEAN DEFAULT TRUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `,
    
    screenshots: `
        CREATE TABLE IF NOT EXISTS screenshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            image_url VARCHAR(500) NOT NULL,
            caption TEXT,
            display_order INTEGER DEFAULT 0,
            FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
        )
    `,
    
    categories: `
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            icon_url VARCHAR(500),
            display_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE
        )
    `,
    
    downloads: `
        CREATE TABLE IF NOT EXISTS downloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_id INTEGER NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
        )
    `
};

// Initialize database
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'picozen.db');
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create database connection
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                reject(err);
                return;
            }
            
            console.log('Connected to SQLite database:', dbPath);
            
            // Enable foreign keys
            db.run('PRAGMA foreign_keys = ON');
            
            // Create tables
            const tableNames = Object.keys(schema);
            let completed = 0;
            
            tableNames.forEach(tableName => {
                db.run(schema[tableName], (err) => {
                    if (err) {
                        console.error(`Error creating table ${tableName}:`, err);
                        reject(err);
                        return;
                    }
                    
                    completed++;
                    if (completed === tableNames.length) {
                        console.log('✅ All database tables created successfully');
                        seedDefaultData().then(resolve).catch(reject);
                    }
                });
            });
        });
    });
}

// Seed default data
async function seedDefaultData() {
    return new Promise((resolve, reject) => {
        // Insert default categories
        const defaultCategories = [
            { name: 'Games', description: 'VR Games and Entertainment', icon_url: '/images/categories/games.png' },
            { name: 'Education', description: 'Learning and Training Applications', icon_url: '/images/categories/education.png' },
            { name: 'Productivity', description: 'Work and Utility Applications', icon_url: '/images/categories/productivity.png' },
            { name: 'Social', description: 'Communication and Social VR', icon_url: '/images/categories/social.png' },
            { name: 'Health & Fitness', description: 'Exercise and Wellness Apps', icon_url: '/images/categories/fitness.png' },
            { name: 'Entertainment', description: 'Media and Video Applications', icon_url: '/images/categories/entertainment.png' },
            { name: 'Tools', description: 'System Utilities and Tools', icon_url: '/images/categories/tools.png' }
        ];
        
        let completed = 0;
        const total = defaultCategories.length;
        
        if (total === 0) {
            resolve();
            return;
        }
        
        defaultCategories.forEach((category, index) => {
            db.run(
                'INSERT OR IGNORE INTO categories (name, description, icon_url, display_order) VALUES (?, ?, ?, ?)',
                [category.name, category.description, category.icon_url, index],
                (err) => {
                    if (err) {
                        console.error('Error inserting category:', err);
                    }
                    
                    completed++;
                    if (completed === total) {
                        console.log('✅ Default categories seeded');
                        resolve();
                    }
                }
            );
        });
    });
}

// Get database instance
function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

// Database helper functions
const dbHelpers = {
    // Get all apps with pagination
    getApps: (page = 1, limit = 20, category = null, search = null) => {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    a.*,
                    c.name as category_name,
                    (SELECT COUNT(*) FROM downloads d WHERE d.app_id = a.id) as download_count
                FROM apps a
                LEFT JOIN categories c ON a.category = c.name
                WHERE a.active = 1
            `;
            const params = [];
            
            if (category) {
                query += ' AND a.category = ?';
                params.push(category);
            }
            
            if (search) {
                query += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.developer LIKE ?)';
                params.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
            
            query += ' ORDER BY a.featured DESC, a.download_count DESC, a.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Get total count for pagination
                let countQuery = 'SELECT COUNT(*) as total FROM apps WHERE active = 1';
                const countParams = [];
                
                if (category) {
                    countQuery += ' AND category = ?';
                    countParams.push(category);
                }
                
                if (search) {
                    countQuery += ' AND (title LIKE ? OR description LIKE ? OR developer LIKE ?)';
                    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
                }
                
                db.get(countQuery, countParams, (err, countRow) => {
                    if (err) {
                        reject(err);
                        return;
                    }\n                    
                    resolve({
                        apps: rows,
                        pagination: {
                            page,
                            limit,
                            total: countRow.total,
                            pages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            });
        });
    },
    
    // Get single app with screenshots
    getApp: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM apps WHERE id = ? AND active = 1', [id], (err, app) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!app) {
                    resolve(null);
                    return;
                }
                
                // Get screenshots
                db.all(
                    'SELECT * FROM screenshots WHERE app_id = ? ORDER BY display_order',
                    [id],
                    (err, screenshots) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        
                        app.screenshots = screenshots;
                        resolve(app);
                    }
                );
            });
        });
    },
    
    // Add new app
    addApp: (appData) => {
        return new Promise((resolve, reject) => {
            const {
                packageName, title, description, shortDescription, version, versionCode,
                category, developer, fileSize, downloadUrl, iconUrl
            } = appData;
            
            db.run(`
                INSERT INTO apps (
                    package_name, title, description, short_description, version, version_code,
                    category, developer, file_size, download_url, icon_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [\n                packageName, title, description, shortDescription, version, versionCode,\n                category, developer, fileSize, downloadUrl, iconUrl\n            ], function(err) {\n                if (err) {\n                    reject(err);\n                    return;\n                }\n                resolve(this.lastID);\n            });\n        });
    },
    
    // Record download
    recordDownload: (appId, ipAddress, userAgent) => {
        return new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO downloads (app_id, ip_address, user_agent) VALUES (?, ?, ?)',
                [appId, ipAddress, userAgent],
                function(err) {
                    if (err) {\n                        reject(err);\n                        return;\n                    }\n                    \n                    // Update download count\n                    db.run(
                        'UPDATE apps SET download_count = download_count + 1 WHERE id = ?',
                        [appId],
                        (err) => {
                            if (err) {\n                                reject(err);\n                                return;\n                            }\n                            resolve();
                        }\n                    );
                }\n            );
        });
    },
    
    // Get categories
    getCategories: () => {
        return new Promise((resolve, reject) => {
            db.all(
                'SELECT *, (SELECT COUNT(*) FROM apps WHERE category = categories.name AND active = 1) as app_count FROM categories WHERE active = 1 ORDER BY display_order',
                [],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }\n                    resolve(rows);
                }\n            );
        });
    }
};