const Database = require('better-sqlite3');
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
    try {
        const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'picozen.db');
        
        // Ensure data directory exists
        const dataDir = path.dirname(dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create database connection
        db = new Database(dbPath);
        
        console.log('Connected to SQLite database:', dbPath);
        
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        // Create tables
        Object.keys(schema).forEach(tableName => {
            try {
                db.exec(schema[tableName]);
                console.log(`✅ Table ${tableName} created/verified`);
            } catch (error) {
                console.error(`Error creating table ${tableName}:`, error);
                throw error;
            }
        });
        
        // Seed default data
        await seedDefaultData();
        
        console.log('✅ Database initialized successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

// Seed default data
async function seedDefaultData() {
    try {
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
        
        const insertCategory = db.prepare(`
            INSERT OR IGNORE INTO categories (name, description, icon_url, display_order) 
            VALUES (?, ?, ?, ?)
        `);
        
        defaultCategories.forEach((category, index) => {
            insertCategory.run(category.name, category.description, category.icon_url, index);
        });
        
        console.log('✅ Default categories seeded');
        
    } catch (error) {
        console.error('Error seeding default data:', error);
    }
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
        try {
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
            
            const apps = db.prepare(query).all(...params);
            
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
            
            const countResult = db.prepare(countQuery).get(...countParams);
            
            return {
                apps,
                pagination: {
                    page,
                    limit,
                    total: countResult.total,
                    pages: Math.ceil(countResult.total / limit)
                }
            };
            
        } catch (error) {
            console.error('Error getting apps:', error);
            throw error;
        }
    },
    
    // Get single app with screenshots
    getApp: (id) => {
        try {
            const app = db.prepare('SELECT * FROM apps WHERE id = ? AND active = 1').get(id);
            
            if (!app) {
                return null;
            }
            
            // Get screenshots
            const screenshots = db.prepare('SELECT * FROM screenshots WHERE app_id = ? ORDER BY display_order').all(id);
            app.screenshots = screenshots;
            
            return app;
            
        } catch (error) {
            console.error('Error getting app:', error);
            throw error;
        }
    },
    
    // Add new app
    addApp: (appData) => {
        try {
            const {
                packageName, title, description, shortDescription, version, versionCode,
                category, developer, fileSize, downloadUrl, iconUrl
            } = appData;
            
            const insert = db.prepare(`
                INSERT INTO apps (
                    package_name, title, description, short_description, version, version_code,
                    category, developer, file_size, download_url, icon_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = insert.run(
                packageName, title, description, shortDescription, version, versionCode,
                category, developer, fileSize, downloadUrl, iconUrl
            );
            
            return result.lastInsertRowid;
            
        } catch (error) {
            console.error('Error adding app:', error);
            throw error;
        }
    },
    
    // Record download
    recordDownload: (appId, ipAddress, userAgent) => {
        try {
            const insertDownload = db.prepare('INSERT INTO downloads (app_id, ip_address, user_agent) VALUES (?, ?, ?)');
            const updateCount = db.prepare('UPDATE apps SET download_count = download_count + 1 WHERE id = ?');
            
            // Use transaction for consistency
            const transaction = db.transaction(() => {
                insertDownload.run(appId, ipAddress, userAgent);
                updateCount.run(appId);
            });
            
            transaction();
            
        } catch (error) {
            console.error('Error recording download:', error);
            throw error;
        }
    },
    
    // Get categories
    getCategories: () => {
        try {
            const categories = db.prepare(`
                SELECT *, 
                (SELECT COUNT(*) FROM apps WHERE category = categories.name AND active = 1) as app_count 
                FROM categories 
                WHERE active = 1 
                ORDER BY display_order
            `).all();
            
            return categories;
            
        } catch (error) {
            console.error('Error getting categories:', error);
            throw error;
        }
    }
};

module.exports = {
    initDatabase,
    getDB,
    ...dbHelpers
};