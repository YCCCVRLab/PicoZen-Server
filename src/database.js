const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pool = null;
let dbInitialized = false;

// Mock data for when database is unavailable
const mockData = {
    apps: [
        {
            id: 1,
            package_name: "com.yccvrlab.demo",
            title: "YCCC VR Demo",
            description: "A demonstration VR application showcasing the capabilities of the PicoZen app store system. Features immersive environments and interactive elements designed for educational purposes.",
            short_description: "Educational VR demonstration app",
            version: "1.0.0",
            version_code: 1,
            category: "Education",
            category_name: "Education",
            developer: "YCCC VR Lab",
            rating: 4.8,
            download_count: 0,
            file_size: 75000000,
            download_url: "#",
            icon_url: "", // Use empty string to avoid DNS issues
            featured: true,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: 2,
            package_name: "com.ubisim.player",
            title: "UbiSim",
            description: "UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.\\n\\nKey Features:\\n• Immersive VR nursing simulations\\n• Realistic patient interactions\\n• Medical equipment training\\n• Clinical procedure practice\\n• Safe learning environment\\n• Professional development tools\\n• Comprehensive skill assessment\\n\\nPerfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.",
            short_description: "Immersive VR nursing simulation platform for clinical training and skill development",
            version: "1.18.0.157",
            version_code: 118000157,
            category: "Education",
            category_name: "Education",
            developer: "UbiSim",
            rating: 4.8,
            download_count: 1250,
            file_size: 157286400,
            download_url: "https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D",
            icon_url: "https://scontent-lga3-3.oculuscdn.com/v/t64.5771-25/57570314_1220899138305712_3549230735456268391_n.jpg?stp=dst-jpg_q92_s720x720_tt6&_nc_cat=108&ccb=1-7&_nc_sid=6e7a0a&_nc_ohc=abiM3cUS1t0Q7kNvwEG6f1M&_nc_oc=Adlp9UfoNVCqrK-SF2vUQyBzNMkhhmJ3jvqEt7cfDM_qYnrQBVzTmcC-E25FLjrIr8Y&_nc_zt=3&_nc_ht=scontent-lga3-3.oculuscdn.com&oh=00_AfbbeH7p7KL9MnwLkOJPJMiKRTOgGj_LNCz46TKiUK_knA&oe=68D3347B",
            featured: true,
            active: true,
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
            download_url: "#",
            icon_url: "", // Use empty string to avoid DNS issues
            featured: false,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ],
    categories: [
        { id: 1, name: "Games", description: "VR Games and Entertainment", icon_url: "", app_count: 1, display_order: 0, active: true },
        { id: 2, name: "Education", description: "Learning and Training Applications", icon_url: "", app_count: 2, display_order: 1, active: true },
        { id: 3, name: "Productivity", description: "Work and Utility Applications", icon_url: "", app_count: 0, display_order: 2, active: true },
        { id: 4, name: "Social", description: "Communication and Social VR", icon_url: "", app_count: 0, display_order: 3, active: true },
        { id: 5, name: "Health & Fitness", description: "Exercise and Wellness Apps", icon_url: "", app_count: 0, display_order: 4, active: true },
        { id: 6, name: "Entertainment", description: "Media and Video Applications", icon_url: "", app_count: 0, display_order: 5, active: true },
        { id: 7, name: "Tools", description: "System Utilities and Tools", icon_url: "", app_count: 0, display_order: 6, active: true }
    ]
};

// Database schema (PostgreSQL compatible)
const schema = {
    apps: `
        CREATE TABLE IF NOT EXISTS apps (
            id SERIAL PRIMARY KEY,
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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
    categories: `
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            icon_url VARCHAR(500),
            app_count INTEGER DEFAULT 0,
            display_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
    screenshots: `
        CREATE TABLE IF NOT EXISTS screenshots (
            id SERIAL PRIMARY KEY,
            app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
            image_url VARCHAR(500) NOT NULL,
            caption TEXT,
            display_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
    downloads: `
        CREATE TABLE IF NOT EXISTS downloads (
            id SERIAL PRIMARY KEY,
            app_id INTEGER REFERENCES apps(id) ON DELETE CASCADE,
            ip_address VARCHAR(45),
            user_agent TEXT,
            downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `
};

// Database connection configuration
function createPool() {
    if (pool) return pool;
    
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
        console.log('📊 No DATABASE_URL found, using mock data');
        return null;
    }
    
    try {
        pool = new Pool({
            connectionString,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        
        console.log('📊 Database pool created successfully');
        return pool;
    } catch (error) {
        console.error('❌ Failed to create database pool:', error);
        return null;
    }
}

// Initialize database
async function initDatabase() {
    try {
        const dbPool = createPool();
        
        if (!dbPool) {
            console.log('📊 Using mock data (no database connection)');
            dbInitialized = true;
            return false; // Indicates mock data mode
        }
        
        // Test connection
        const client = await dbPool.connect();
        console.log('📊 Database connection established');
        
        // Create tables
        for (const [tableName, createSQL] of Object.entries(schema)) {
            await client.query(createSQL);
            console.log(`✅ Table '${tableName}' ready`);
        }
        
        // Insert default categories if they don't exist
        const categoryCount = await client.query('SELECT COUNT(*) FROM categories');
        if (parseInt(categoryCount.rows[0].count) === 0) {
            console.log('📊 Inserting default categories...');
            
            for (const category of mockData.categories) {
                await client.query(`
                    INSERT INTO categories (name, description, icon_url, app_count, display_order, active)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (name) DO NOTHING
                `, [category.name, category.description, category.icon_url, category.app_count, category.display_order, category.active]);
            }
            
            console.log('✅ Default categories inserted');
        }
        
        client.release();
        dbInitialized = true;
        console.log('✅ Database initialized successfully');
        return true; // Indicates real database mode
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        console.log('📊 Falling back to mock data');
        dbInitialized = true;
        return false; // Indicates mock data mode
    }
}

// Get database instance
function getDB() {
    return pool;
}

// Database helper functions
const dbHelpers = {
    // Get apps with pagination and filtering
    async getApps(page = 1, limit = 20, category = null, search = null) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                // Use mock data
                let filteredApps = [...mockData.apps];
                
                // Apply category filter
                if (category && category.toLowerCase() !== 'all') {
                    filteredApps = filteredApps.filter(app => 
                        app.category.toLowerCase() === category.toLowerCase()
                    );
                }
                
                // Apply search filter
                if (search) {
                    const searchLower = search.toLowerCase();
                    filteredApps = filteredApps.filter(app =>
                        app.title.toLowerCase().includes(searchLower) ||
                        app.description.toLowerCase().includes(searchLower) ||
                        app.developer.toLowerCase().includes(searchLower)
                    );
                }
                
                // Apply pagination
                const offset = (page - 1) * limit;
                const paginatedApps = filteredApps.slice(offset, offset + limit);
                
                return {
                    apps: paginatedApps,
                    pagination: {
                        page,
                        limit,
                        total: filteredApps.length,
                        pages: Math.ceil(filteredApps.length / limit)
                    }
                };
            }
            
            // Build query with filters
            let whereConditions = ['active = TRUE'];
            let params = [];
            let paramIndex = 1;
            
            if (category && category.toLowerCase() !== 'all') {
                whereConditions.push(`LOWER(category) = LOWER($${paramIndex})`);
                params.push(category);
                paramIndex++;
            }
            
            if (search) {
                whereConditions.push(`(
                    LOWER(title) LIKE LOWER($${paramIndex}) OR 
                    LOWER(description) LIKE LOWER($${paramIndex + 1}) OR 
                    LOWER(developer) LIKE LOWER($${paramIndex + 2})
                )`);
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
                paramIndex += 3;
            }
            
            const whereClause = whereConditions.join(' AND ');
            
            // Get total count
            const countQuery = `SELECT COUNT(*) FROM apps WHERE ${whereClause}`;
            const countResult = await dbPool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count);
            
            // Get paginated results
            const offset = (page - 1) * limit;
            const dataQuery = `
                SELECT * FROM apps 
                WHERE ${whereClause}
                ORDER BY download_count DESC, created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            params.push(limit, offset);
            
            const dataResult = await dbPool.query(dataQuery, params);
            
            return {
                apps: dataResult.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
            
        } catch (error) {
            console.error('Error in getApps:', error);
            // Fallback to mock data
            return {
                apps: mockData.apps.slice(0, limit),
                pagination: {
                    page: 1,
                    limit,
                    total: mockData.apps.length,
                    pages: Math.ceil(mockData.apps.length / limit)
                }
            };
        }
    },
    
    // Get single app by ID
    async getApp(id) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                // Use mock data
                return mockData.apps.find(app => app.id === id);
            }
            
            const result = await dbPool.query(
                'SELECT * FROM apps WHERE id = $1 AND active = TRUE',
                [id]
            );
            
            return result.rows[0] || null;
            
        } catch (error) {
            console.error('Error in getApp:', error);
            // Fallback to mock data
            return mockData.apps.find(app => app.id === id);
        }
    },
    
    // Get categories
    async getCategories() {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                // Use mock data
                return mockData.categories;
            }
            
            const result = await dbPool.query(
                'SELECT * FROM categories WHERE active = TRUE ORDER BY display_order, name'
            );
            
            return result.rows;
            
        } catch (error) {
            console.error('Error in getCategories:', error);
            // Fallback to mock data
            return mockData.categories;
        }
    },
    
    // Record download
    async recordDownload(appId, ipAddress, userAgent) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                // Can't record downloads without database, but don't fail
                console.log(`Mock download recorded for app ${appId}`);
                return true;
            }
            
            // Record the download
            await dbPool.query(
                'INSERT INTO downloads (app_id, ip_address, user_agent) VALUES ($1, $2, $3)',
                [appId, ipAddress, userAgent]
            );
            
            // Update download count
            await dbPool.query(
                'UPDATE apps SET download_count = download_count + 1 WHERE id = $1',
                [appId]
            );
            
            return true;
            
        } catch (error) {
            console.error('Error recording download:', error);
            return false;
        }
    },
    
    // Add new app
    async addApp(appData) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                throw new Error('Database not available');
            }
            
            const result = await dbPool.query(`
                INSERT INTO apps (
                    package_name, title, description, short_description, version, version_code,
                    category, developer, rating, download_count, file_size, download_url, icon_url, featured
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
            `, [
                appData.packageName,
                appData.title,
                appData.description,
                appData.shortDescription,
                appData.version,
                appData.versionCode,
                appData.category,
                appData.developer,
                appData.rating || 0,
                appData.downloadCount || 0,
                appData.fileSize,
                appData.downloadUrl,
                appData.iconUrl,
                appData.featured || false
            ]);
            
            return result.rows[0];
            
        } catch (error) {
            console.error('Error adding app:', error);
            throw error;
        }
    },
    
    // Update app
    async updateApp(id, appData) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                throw new Error('Database not available');
            }
            
            const result = await dbPool.query(`
                UPDATE apps SET
                    title = $2, description = $3, short_description = $4, version = $5,
                    version_code = $6, category = $7, developer = $8, rating = $9,
                    file_size = $10, download_url = $11, icon_url = $12, featured = $13,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND active = TRUE
                RETURNING *
            `, [
                id,
                appData.title,
                appData.description,
                appData.shortDescription,
                appData.version,
                appData.versionCode,
                appData.category,
                appData.developer,
                appData.rating,
                appData.fileSize,
                appData.downloadUrl,
                appData.iconUrl,
                appData.featured
            ]);
            
            return result.rows[0] || null;
            
        } catch (error) {
            console.error('Error updating app:', error);
            throw error;
        }
    },
    
    // Delete app (soft delete)
    async deleteApp(id) {
        try {
            const dbPool = getDB();
            
            if (!dbPool) {
                throw new Error('Database not available');
            }
            
            const result = await dbPool.query(
                'UPDATE apps SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
                [id]
            );
            
            return result.rows.length > 0;
            
        } catch (error) {
            console.error('Error deleting app:', error);
            throw error;
        }
    }
};

module.exports = {
    initDatabase,
    getDB,
    dbHelpers,
    mockData
};