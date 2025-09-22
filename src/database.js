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
            download_count: 150,
            file_size: 75000000,
            download_url: "https://example.com/yccvrlab-demo.apk",
            icon_url: "/images/apps/yccvrlab-demo.png",
            featured: true,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ],
    categories: [
        { id: 1, name: "Games", description: "VR Games and Entertainment", icon_url: "/images/categories/games.png", app_count: 0, display_order: 0, active: true },
        { id: 2, name: "Education", description: "Learning and Training Applications", icon_url: "/images/categories/education.png", app_count: 1, display_order: 1, active: true },
        { id: 3, name: "Productivity", description: "Work and Utility Applications", icon_url: "/images/categories/productivity.png", app_count: 0, display_order: 2, active: true },
        { id: 4, name: "Social", description: "Communication and Social VR", icon_url: "/images/categories/social.png", app_count: 0, display_order: 3, active: true },
        { id: 5, name: "Health & Fitness", description: "Exercise and Wellness Apps", icon_url: "/images/categories/fitness.png", app_count: 0, display_order: 4, active: true },
        { id: 6, name: "Entertainment", description: "Media and Video Applications", icon_url: "/images/categories/entertainment.png", app_count: 0, display_order: 5, active: true },
        { id: 7, name: "Tools", description: "System Utilities and Tools", icon_url: "/images/categories/tools.png", app_count: 0, display_order: 6, active: true }
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
            rating NUMERIC(2,1) DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            file_size BIGINT,
            download_url VARCHAR(500),
            icon_url VARCHAR(500),
            featured BOOLEAN DEFAULT FALSE,
            active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `,
    
    screenshots: `
        CREATE TABLE IF NOT EXISTS screenshots (
            id SERIAL PRIMARY KEY,
            app_id INTEGER NOT NULL,
            image_url VARCHAR(500) NOT NULL,
            caption TEXT,
            display_order INTEGER DEFAULT 0,
            FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
        );
    `,
    
    categories: `
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            icon_url VARCHAR(500),
            display_order INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT TRUE
        );
    `,
    
    downloads: `
        CREATE TABLE IF NOT EXISTS downloads (
            id SERIAL PRIMARY KEY,
            app_id INTEGER NOT NULL,
            ip_address VARCHAR(45),
            user_agent TEXT,
            downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
        );
    `
};

// Initialize database connection pool and schema
async function initDatabase() {
    if (dbInitialized) {
        return true;
    }

    try {
        const connectionString = process.env.POSTGRES_URL;
        if (!connectionString) {
            console.warn("⚠️ POSTGRES_URL not set, using mock data");
            dbInitialized = true;
            return false; // No real database, but don't throw error
        }

        console.log('🔄 Initializing database connection...');

        // Enhanced SSL configuration for Neon
        const poolConfig = {
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false,
                // Neon-specific SSL settings
                require: true,
                ca: undefined,
                cert: undefined,
                key: undefined
            },
            // Optimized for serverless/Koyeb
            max: 1,
            min: 0,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 8000,
            acquireTimeoutMillis: 8000,
            createTimeoutMillis: 8000,
            destroyTimeoutMillis: 5000,
            createRetryIntervalMillis: 500,
        };

        // Override SSL settings based on connection string
        if (connectionString.includes('sslmode=require')) {
            poolConfig.ssl = {
                rejectUnauthorized: false,
                require: true
            };
        }

        console.log('🔄 Creating connection pool with enhanced SSL settings...');
        pool = new Pool(poolConfig);

        // Test connection with enhanced error handling
        let retries = 3;
        let lastError = null;
        
        while (retries > 0) {
            try {
                console.log(`🔄 Testing database connection... (attempt ${4 - retries})`);
                const result = await pool.query('SELECT 1 as test, NOW() as timestamp');
                console.log('✅ Database connection successful!', result.rows[0]);
                break;
            } catch (error) {
                lastError = error;
                retries--;
                console.error(`❌ Connection attempt failed:`, error.message);
                
                if (retries === 0) {
                    console.error('❌ All connection attempts failed. Last error:', error);
                    throw new Error(`Database connection failed after 3 attempts: ${error.message}`);
                }
                
                console.log(`🔄 Retrying connection... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Create tables with error handling
        console.log('🔄 Creating/verifying database tables...');
        for (const [tableName, tableSQL] of Object.entries(schema)) {
            try {
                await pool.query(tableSQL);
                console.log(`✅ Table '${tableName}' created/verified.`);
            } catch (error) {
                console.error(`❌ Error creating table '${tableName}':`, error.message);
                throw error;
            }
        }

        // Seed default data
        await seedDefaultData();

        console.log('✅ Database initialized successfully.');
        dbInitialized = true;
        return true;

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        // Clean up failed pool
        if (pool) {
            try {
                await pool.end();
            } catch (e) {
                // Ignore cleanup errors
            }
            pool = null;
        }
        
        console.log('🔄 Falling back to mock data...');
        dbInitialized = true;
        return false; // Use mock data
    }
}

// Seed default data
async function seedDefaultData() {
    if (!pool) return;
    
    try {
        console.log('🔄 Seeding default categories...');
        const defaultCategories = [
            { name: 'Games', description: 'VR Games and Entertainment', icon_url: '/images/categories/games.png' },
            { name: 'Education', description: 'Learning and Training Applications', icon_url: '/images/categories/education.png' },
            { name: 'Productivity', description: 'Work and Utility Applications', icon_url: '/images/categories/productivity.png' },
            { name: 'Social', description: 'Communication and Social VR', icon_url: '/images/categories/social.png' },
            { name: 'Health & Fitness', description: 'Exercise and Wellness Apps', icon_url: '/images/categories/fitness.png' },
            { name: 'Entertainment', description: 'Media and Video Applications', icon_url: '/images/categories/entertainment.png' },
            { name: 'Tools', description: 'System Utilities and Tools', icon_url: '/images/categories/tools.png' }
        ];

        for (let i = 0; i < defaultCategories.length; i++) {
            const category = defaultCategories[i];
            await pool.query(
                'INSERT INTO categories (name, description, icon_url, display_order) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
                [category.name, category.description, category.icon_url, i]
            );
        }
        console.log('✅ Default categories seeded.');

        // Add sample app if none exist
        const { rows } = await pool.query('SELECT COUNT(*) as count FROM apps');
        if (parseInt(rows[0].count) === 0) {
            console.log('🔄 Adding sample VR app...');
            await pool.query(`
                INSERT INTO apps (package_name, title, description, short_description, version, version_code, category, developer, rating, file_size, download_url, icon_url, featured)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `, [
                'com.yccvrlab.demo',
                'YCCC VR Demo',
                'A demonstration VR application showcasing the capabilities of the PicoZen app store system. Features immersive environments and interactive elements designed for educational purposes.',
                'Educational VR demonstration app',
                '1.0.0',
                1,
                'Education',
                'YCCC VR Lab',
                4.8,
                75000000,
                'https://example.com/yccvrlab-demo.apk',
                '/images/apps/yccvrlab-demo.png',
                true
            ]);
            console.log('✅ Sample VR app added.');
        }

    } catch (error) {
        console.error('❌ Error seeding default data:', error.message);
        // Don't throw - categories are not critical for basic functionality
    }
}

// Get database client
function getDB() {
    return pool;
}

// Database helper functions with fallback to mock data
const dbHelpers = {
    // Get all apps with pagination
    getApps: async (page = 1, limit = 20, category = null, search = null) => {
        try {
            // Try to initialize database if not done
            if (!dbInitialized) {
                await initDatabase();
            }

            // If no database connection, use mock data
            if (!pool) {
                console.log('📋 Using mock data for apps');
                let apps = [...mockData.apps];
                
                // Apply filters to mock data
                if (category) {
                    apps = apps.filter(app => app.category === category);
                }
                if (search) {
                    const searchLower = search.toLowerCase();
                    apps = apps.filter(app => 
                        app.title.toLowerCase().includes(searchLower) ||
                        app.description.toLowerCase().includes(searchLower) ||
                        app.developer.toLowerCase().includes(searchLower)
                    );
                }
                
                const total = apps.length;
                const offset = (page - 1) * limit;
                apps = apps.slice(offset, offset + limit);
                
                return {
                    apps,
                    pagination: {
                        page,
                        limit,
                        total,
                        pages: Math.ceil(total / limit)
                    }
                };
            }

            // Use real database
            console.log('💾 Using real database for apps');
            const offset = (page - 1) * limit;
            let query = `
                SELECT 
                    a.*,
                    c.name as category_name,
                    COALESCE((SELECT COUNT(*) FROM downloads d WHERE d.app_id = a.id), 0) as download_count
                FROM apps a
                LEFT JOIN categories c ON a.category = c.name
                WHERE a.active = TRUE
            `;
            const params = [];

            if (category) {
                query += ' AND a.category = $1';
                params.push(category);
            }

            if (search) {
                const searchParam = `%${search}%`;
                if (params.length === 0) {
                    query += ' AND (a.title ILIKE $1 OR a.description ILIKE $1 OR a.developer ILIKE $1)';
                    params.push(searchParam);
                } else {
                    query += ' AND (a.title ILIKE $' + (params.length + 1) + ' OR a.description ILIKE $' + (params.length + 1) + ' OR a.developer ILIKE $' + (params.length + 1) + ')';
                    params.push(searchParam);
                }
            }

            query += ` ORDER BY a.featured DESC, a.download_count DESC, a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const { rows: apps } = await pool.query(query, params);

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM apps WHERE active = TRUE';
            const countParams = [];

            if (category) {
                countQuery += ' AND category = $1';
                countParams.push(category);
            }

            if (search) {
                const searchParam = `%${search}%`;
                if (countParams.length === 0) {
                    countQuery += ' AND (title ILIKE $1 OR description ILIKE $1 OR developer ILIKE $1)';
                    countParams.push(searchParam);
                } else {
                    countQuery += ' AND (title ILIKE $' + (countParams.length + 1) + ' OR description ILIKE $' + (countParams.length + 1) + ' OR developer ILIKE $' + (countParams.length + 1) + ')';
                    countParams.push(searchParam);
                }
            }

            const { rows: countRows } = await pool.query(countQuery, countParams);
            const total = parseInt(countRows[0].total);

            return {
                apps,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('Error getting apps, falling back to mock data:', error.message);
            // Fallback to mock data
            return {
                apps: mockData.apps,
                pagination: { page: 1, limit: 20, total: mockData.apps.length, pages: 1 }
            };
        }
    },

    // Get single app
    getApp: async (id) => {
        try {
            if (!dbInitialized) {
                await initDatabase();
            }

            if (!pool) {
                return mockData.apps.find(app => app.id === parseInt(id)) || null;
            }

            const { rows: appRows } = await pool.query('SELECT * FROM apps WHERE id = $1 AND active = TRUE', [id]);
            const app = appRows[0];

            if (!app) {
                return null;
            }

            // Get screenshots
            const { rows: screenshots } = await pool.query(
                'SELECT * FROM screenshots WHERE app_id = $1 ORDER BY display_order',
                [id]
            );
            app.screenshots = screenshots;

            return app;

        } catch (error) {
            console.error('Error getting app:', error.message);
            return mockData.apps.find(app => app.id === parseInt(id)) || null;
        }
    },

    // Get categories
    getCategories: async () => {
        try {
            if (!dbInitialized) {
                await initDatabase();
            }

            if (!pool) {
                return mockData.categories;
            }

            const { rows: categories } = await pool.query(`
                SELECT c.*, 
                COALESCE((SELECT COUNT(*) FROM apps WHERE category = c.name AND active = TRUE), 0) as app_count 
                FROM categories c
                WHERE c.active = TRUE
                ORDER BY c.display_order
            `);
            return categories;

        } catch (error) {
            console.error('Error getting categories:', error.message);
            return mockData.categories;
        }
    },

    // Add new app
    addApp: async (appData) => {
        if (!pool) {
            throw new Error('Database not available');
        }

        const {
            packageName, title, description, shortDescription, version, versionCode,
            category, developer, fileSize, downloadUrl, iconUrl
        } = appData;

        const { rows } = await pool.query(`
            INSERT INTO apps (
                package_name, title, description, short_description, version, version_code,
                category, developer, file_size, download_url, icon_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            packageName, title, description, shortDescription, version, versionCode,
            category, developer, fileSize, downloadUrl, iconUrl
        ]);

        return rows[0].id;
    },

    // Record download
    recordDownload: async (appId, ipAddress, userAgent) => {
        if (!pool) {
            console.log('📋 Mock: Recording download for app', appId);
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('INSERT INTO downloads (app_id, ip_address, user_agent) VALUES ($1, $2, $3)', [appId, ipAddress, userAgent]);
            await client.query('UPDATE apps SET download_count = download_count + 1 WHERE id = $1', [appId]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = { initDatabase, getDB, dbHelpers };