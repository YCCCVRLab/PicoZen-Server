const { Pool } = require('pg'); // Use standard pg client
const path = require('path');
const fs = require('fs');

let pool = null;

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
    try {
        const connectionString = process.env.POSTGRES_URL; // Use POSTGRES_URL from Vercel integration
        if (!connectionString) {
            throw new Error("POSTGRES_URL environment variable is not set by Vercel integration.");
        }

        console.log('🔄 Configuring database connection...');

        // More robust SSL configuration for Supabase/Vercel
        let sslConfig = false;
        
        // Check if we need SSL (production or if connection string contains SSL requirements)
        if (process.env.NODE_ENV === 'production' || connectionString.includes('sslmode') || connectionString.includes('supabase')) {
            sslConfig = {
                rejectUnauthorized: false,
                // Handle certificate verification issues
                ca: undefined,
                cert: undefined,
                key: undefined
            };
            
            // Override SSL mode if PGSSLMODE is set
            if (process.env.PGSSLMODE === 'no-verify' || process.env.PGSSLMODE === 'disable') {
                sslConfig.rejectUnauthorized = false;
            }
        }

        const poolConfig = {
            connectionString: connectionString,
            ssl: sslConfig,
            // Optimized for serverless/Vercel functions
            max: 1,
            min: 0,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 5000,
            acquireTimeoutMillis: 5000,
            createTimeoutMillis: 5000,
            destroyTimeoutMillis: 5000,
            createRetryIntervalMillis: 200,
        };

        console.log('🔄 Creating connection pool with SSL:', sslConfig ? 'enabled (no-verify)' : 'disabled');
        pool = new Pool(poolConfig);

        // Test connection with enhanced error handling
        let retries = 3;
        let lastError = null;
        
        while (retries > 0) {
            try {
                console.log(`🔄 Testing database connection... (attempt ${4 - retries})`);
                const result = await pool.query('SELECT 1 as test');
                console.log('✅ Database connection successful!');
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
                await new Promise(resolve => setTimeout(resolve, 1000));
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
        return true;

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        // Don't throw in serverless environment - let it retry on next request
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 Will retry database connection on next request...');
            return false;
        }
        throw error;
    }
}

// Seed default data
async function seedDefaultData() {
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

    } catch (error) {
        console.error('❌ Error seeding default data:', error.message);
        // Don't throw - categories are not critical for basic functionality
    }
}

// Get database client with connection check
function getDB() {
    if (!pool) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return pool;
}

// Database helper functions with better error handling
const dbHelpers = {
    // Get all apps with pagination
    getApps: async (page = 1, limit = 20, category = null, search = null) => {
        try {
            // Ensure database is connected
            if (!pool) {
                await initDatabase();
            }

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

            // Get total count for pagination
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
            console.error('Error getting apps:', error);
            throw error;
        }
    },

    // Get single app with screenshots
    getApp: async (id) => {
        try {
            if (!pool) {
                await initDatabase();
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
            console.error('Error getting app:', error);
            throw error;
        }
    },

    // Add new app
    addApp: async (appData) => {
        try {
            if (!pool) {
                await initDatabase();
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

        } catch (error) {
            console.error('Error adding app:', error);
            throw error;
        }
    },

    // Record download
    recordDownload: async (appId, ipAddress, userAgent) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('INSERT INTO downloads (app_id, ip_address, user_agent) VALUES ($1, $2, $3)', [appId, ipAddress, userAgent]);
            await client.query('UPDATE apps SET download_count = download_count + 1 WHERE id = $1', [appId]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error recording download:', error);
            throw error;
        } finally {
            client.release();
        }
    },

    // Get categories
    getCategories: async () => {
        try {
            if (!pool) {
                await initDatabase();
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
            console.error('Error getting categories:', error);
            throw error;
        }
    }
};

module.exports = { initDatabase, getDB, dbHelpers };