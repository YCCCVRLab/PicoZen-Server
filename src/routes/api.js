const express = require('express');
const path = require('path');
const fs = require('fs').promises;
// Import the entire database module, then access dbHelpers
const database = require('../database'); 
// Temporarily use simplified scrapers to avoid File reference errors
const { scrapeAppFromUrl, getFileSizeFromUrl, formatFileSize, parseFileSize } = require('../scrapers-simple');

const router = express.Router();

// Enhanced CORS headers for VR app compatibility and GitHub Pages
router.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // Allow specific origins including GitHub Pages
    const allowedOrigins = [
        'https://ycccrlab.github.io',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080'
    ];
    
    if (allowedOrigins.includes(origin) || !origin) {
        res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
        // Allow localhost with any port for development
        if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
            res.header('Access-Control-Allow-Origin', origin);
        } else {
            res.header('Access-Control-Allow-Origin', '*');
        }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    // Log CORS requests for debugging
    if (req.method === 'OPTIONS' || origin) {
        console.log(`CORS request from ${origin || 'unknown'} to ${req.path}`);
    }
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint for VR app connectivity
router.get('/health', async (req, res) => {
    try {
        // Try to initialize database
        const dbStatus = await database.initDatabase();
        
        res.json({
            success: true,
            status: 'ok',
            timestamp: new Date().toISOString(),
            server: 'PicoZen-Server',
            version: '1.0.0',
            database: dbStatus ? 'connected' : 'mock_data',
            cors: 'enabled',
            origin: req.headers.origin || 'none'
        });
    } catch (error) {
        res.json({
            success: true,
            status: 'ok',
            timestamp: new Date().toISOString(),
            server: 'PicoZen-Server',
            version: '1.0.0',
            database: 'mock_data',
            note: 'Using fallback data',
            cors: 'enabled',
            origin: req.headers.origin || 'none'
        });
    }
});

// Scrape app data from store URL
router.post('/scrape', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'URL is required'
            });
        }
        
        console.log(`Scraping URL: ${url}`);
        const result = await scrapeAppFromUrl(url);
        
        // If successful, try to get actual file size from download URL
        if (result.success && result.data.downloadUrl) {
            try {
                const actualFileSize = await getFileSizeFromUrl(result.data.downloadUrl);
                if (actualFileSize) {
                    result.data.fileSize = actualFileSize;
                    console.log(`Updated file size from URL: ${formatFileSize(actualFileSize)}`);
                }
            } catch (sizeError) {
                console.warn('Could not get file size from URL:', sizeError.message);
            }
        }
        
        res.json(result);
        
    } catch (error) {
        console.error('Error in scrape endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to scrape URL: ' + error.message
        });
    }
});

// Get all apps with pagination and filtering
router.get('/apps', async (req, res) => {
    try {
        console.log(`Apps request from origin: ${req.headers.origin || 'none'}`);
        
        const {
            page = 1,
            limit = 20,
            category,
            search,
            featured,
            sort = 'downloads'
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid pagination parameters'
            });
        }
        
        // Get apps with fallback handling
        const result = await database.dbHelpers.getApps(pageNum, limitNum, category, search);
        
        // Transform data for API response with proper file size formatting
        const transformedApps = result.apps.map(app => {
            // Ensure file size is properly formatted
            let fileSizeFormatted = null;
            if (app.file_size) {
                // Convert to number if it's a string
                const sizeInBytes = typeof app.file_size === 'string' ? 
                                   parseFileSize(app.file_size) || parseInt(app.file_size) : 
                                   app.file_size;
                fileSizeFormatted = formatFileSize(sizeInBytes);
            }
            
            return {
                id: app.id,
                packageName: app.package_name,
                title: app.title,
                description: app.description,
                shortDescription: app.short_description,
                version: app.version,
                versionCode: app.version_code,
                category: app.category,
                categoryName: app.category_name || app.category,
                developer: app.developer,
                rating: app.rating,
                downloadCount: app.download_count,
                fileSize: app.file_size, // Raw bytes for calculations
                fileSizeFormatted: fileSizeFormatted, // Human readable
                downloadUrl: `/api/download/${app.id}`,
                iconUrl: app.icon_url,
                featured: Boolean(app.featured),
                createdAt: app.created_at,
                updatedAt: app.updated_at
            };
        });
        
        console.log(`Returning ${transformedApps.length} apps to ${req.headers.origin || 'unknown'}`);
        
        res.json({
            success: true,
            apps: transformedApps,
            pagination: result.pagination,
            server: 'PicoZen-Server',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error fetching apps:', error);
        
        // Return a more user-friendly error response with CORS headers
        res.status(200).json({
            success: true,
            apps: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 },
            note: 'Service temporarily unavailable, please try again later',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get single app details
router.get('/apps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const appId = parseInt(id);
        
        if (isNaN(appId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid app ID'
            });
        }
        
        // Get app with fallback handling
        const app = await database.dbHelpers.getApp(appId);
        
        if (!app) {
            return res.status(404).json({
                success: false,
                error: 'App not found'
            });
        }
        
        // Transform data for API response with proper file size
        let fileSizeFormatted = null;
        if (app.file_size) {
            const sizeInBytes = typeof app.file_size === 'string' ? 
                               parseFileSize(app.file_size) || parseInt(app.file_size) : 
                               app.file_size;
            fileSizeFormatted = formatFileSize(sizeInBytes);
        }
        
        const transformedApp = {
            id: app.id,
            packageName: app.package_name,
            title: app.title,
            description: app.description,
            shortDescription: app.short_description,
            version: app.version,
            versionCode: app.version_code,
            category: app.category,
            developer: app.developer,
            rating: app.rating,
            downloadCount: app.download_count,
            fileSize: app.file_size,
            fileSizeFormatted: fileSizeFormatted,
            downloadUrl: `/api/download/${app.id}`,
            iconUrl: app.icon_url,
            featured: Boolean(app.featured),
            screenshots: app.screenshots || [],
            createdAt: app.created_at,
            updatedAt: app.updated_at
        };
        
        res.json({
            success: true,
            app: transformedApp
        });
        
    } catch (error) {
        console.error('Error fetching app:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch app details',
            message: error.message
        });
    }
});

// Download APK file with proper file size headers
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const appId = parseInt(id);
        
        if (isNaN(appId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid app ID'
            });
        }
        
        // Get app with fallback handling
        const app = await database.dbHelpers.getApp(appId);
        
        if (!app) {
            return res.status(404).json({
                success: false,
                error: 'App not found'
            });
        }
        
        // Record the download
        const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.get('User-Agent');
        
        try {
            await database.dbHelpers.recordDownload(appId, clientIp, userAgent);
        } catch (downloadError) {
            console.error('Error recording download:', downloadError);
            // Don't fail the download if we can't record it
        }
        
        // Handle different download URL types
        if (app.download_url) {
            if (app.download_url.startsWith('http://') || app.download_url.startsWith('https://')) {
                // External URL - get file info and redirect or proxy
                try {
                    // Try to get the actual file size from the URL
                    const actualFileSize = await getFileSizeFromUrl(app.download_url);
                    
                    // Set headers before redirect
                    if (actualFileSize) {
                        res.setHeader('Content-Length', actualFileSize);
                    } else if (app.file_size) {
                        // Use stored file size as fallback
                        const sizeInBytes = typeof app.file_size === 'string' ? 
                                           parseFileSize(app.file_size) || parseInt(app.file_size) : 
                                           app.file_size;
                        if (sizeInBytes) {
                            res.setHeader('Content-Length', sizeInBytes);
                        }
                    }
                    
                    res.setHeader('Content-Disposition', `attachment; filename="${app.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${app.version}.apk"`);
                    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                    
                    return res.redirect(app.download_url);
                } catch (urlError) {
                    console.error('Error checking external URL:', urlError.message);
                    // Still try to redirect even if we can't get file info
                    return res.redirect(app.download_url);
                }
            } else if (app.download_url.startsWith('/')) {
                // Local file path
                const filePath = path.join(__dirname, '..', '..', app.download_url);
                
                try {
                    const stats = await fs.stat(filePath);
                    
                    // Set appropriate headers with actual file size
                    res.setHeader('Content-Disposition', `attachment; filename="${app.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${app.version}.apk"`);
                    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                    res.setHeader('Content-Length', stats.size);
                    
                    return res.sendFile(path.resolve(filePath));
                } catch (fileError) {
                    console.error('File not found:', filePath, fileError.message);
                    return res.status(404).json({
                        success: false,
                        error: 'APK file not found on server'
                    });
                }
            }
        }
        
        // No valid download URL
        res.status(404).json({
            success: false,
            error: 'Download not available for this app'
        });
        
    } catch (error) {
        console.error('Error downloading app:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to download app',
            message: error.message
        });
    }
});

// Get categories
router.get('/categories', async (req, res) => {
    try {
        // Get categories with fallback handling
        const categories = await database.dbHelpers.getCategories();
        
        const transformedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            description: cat.description,
            iconUrl: cat.icon_url,
            appCount: cat.app_count,
            displayOrder: cat.display_order
        }));
        
        res.json({
            success: true,
            categories: transformedCategories
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        
        // Return basic categories as fallback
        res.json({
            success: true,
            categories: [
                { id: 1, name: "Games", description: "VR Games and Entertainment", iconUrl: "", appCount: 0, displayOrder: 0 },
                { id: 2, name: "Education", description: "Learning Applications", iconUrl: "", appCount: 0, displayOrder: 1 },
                { id: 3, name: "Tools", description: "Utilities and Tools", iconUrl: "", appCount: 0, displayOrder: 2 }
            ]
        });
    }
});

// Search apps
router.get('/search', async (req, res) => {
    try {
        const {
            q: query,
            page = 1,
            limit = 20,
            category
        } = req.query;
        
        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters long'
            });
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        // Get apps with search and fallback handling
        const result = await database.dbHelpers.getApps(pageNum, limitNum, category, query.trim());
        
        // Transform data for API response
        const transformedApps = result.apps.map(app => {
            let fileSizeFormatted = null;
            if (app.file_size) {
                const sizeInBytes = typeof app.file_size === 'string' ? 
                                   parseFileSize(app.file_size) || parseInt(app.file_size) : 
                                   app.file_size;
                fileSizeFormatted = formatFileSize(sizeInBytes);
            }
            
            return {
                id: app.id,
                packageName: app.package_name,
                title: app.title,
                description: app.description,
                shortDescription: app.short_description,
                version: app.version,
                category: app.category,
                developer: app.developer,
                rating: app.rating,
                downloadCount: app.download_count,
                fileSize: app.file_size,
                fileSizeFormatted: fileSizeFormatted,
                downloadUrl: `/api/download/${app.id}`,
                iconUrl: app.icon_url,
                featured: Boolean(app.featured)
            };
        });
        
        res.json({
            success: true,
            query: query.trim(),
            apps: transformedApps,
            pagination: result.pagination
        });
        
    } catch (error) {
        console.error('Error searching apps:', error);
        res.json({
            success: true,
            query: req.query.q || '',
            apps: [],
            pagination: { page: 1, limit: 20, total: 0, pages: 0 }
        });
    }
});

// Get featured apps
router.get('/featured', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);
        
        // Get apps with fallback handling
        const result = await database.dbHelpers.getApps(1, limitNum);
        
        // Filter only featured apps
        const featuredApps = result.apps
            .filter(app => app.featured)
            .map(app => {
                let fileSizeFormatted = null;
                if (app.file_size) {
                    const sizeInBytes = typeof app.file_size === 'string' ? 
                                       parseFileSize(app.file_size) || parseInt(app.file_size) : 
                                       app.file_size;
                    fileSizeFormatted = formatFileSize(sizeInBytes);
                }
                
                return {
                    id: app.id,
                    packageName: app.package_name,
                    title: app.title,
                    shortDescription: app.short_description,
                    category: app.category,
                    developer: app.developer,
                    rating: app.rating,
                    downloadCount: app.download_count,
                    fileSize: app.file_size,
                    fileSizeFormatted: fileSizeFormatted,
                    downloadUrl: `/api/download/${app.id}`,
                    iconUrl: app.icon_url
                };
            });
        
        res.json({
            success: true,
            apps: featuredApps
        });
        
    } catch (error) {
        console.error('Error fetching featured apps:', error);
        res.json({
            success: true,
            apps: []
        });
    }
});

// Get app statistics
router.get('/stats', async (req, res) => {
    try {
        const db = database.getDB();
        
        if (!db) {
            // Return mock stats if no database
            return res.json({
                success: true,
                stats: {
                    totalApps: 1,
                    totalDownloads: 100,
                    totalCategories: 3,
                    totalSizeBytes: 50000000,
                    totalSizeFormatted: formatFileSize(50000000)
                }
            });
        }
        
        // Get various statistics
        const stats = await new Promise((resolve, reject) => {
            const queries = [
                'SELECT COUNT(*) as totalApps FROM apps WHERE active = TRUE',
                'SELECT COUNT(*) as totalDownloads FROM downloads',
                'SELECT COUNT(DISTINCT category) as totalCategories FROM apps WHERE active = TRUE',
                'SELECT SUM(file_size) as totalSize FROM apps WHERE active = TRUE'
            ];
            
            let results = {};
            let completed = 0;
            
            queries.forEach(queryText => {
                db.query(queryText, [], (err, res) => {
                    if (err) return reject(err);
                    Object.assign(results, res.rows[0]);
                    completed++;
                    if (completed === queries.length) resolve(results);
                });
            });
        });
        
        res.json({
            success: true,
            stats: {
                totalApps: parseInt(stats.totalapps),
                totalDownloads: parseInt(stats.totaldownloads),
                totalCategories: parseInt(stats.totalcategories),
                totalSizeBytes: parseInt(stats.totalsize) || 0,
                totalSizeFormatted: formatFileSize(parseInt(stats.totalsize) || 0)
            }
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.json({
            success: true,
            stats: {
                totalApps: 0,
                totalDownloads: 0,
                totalCategories: 0,
                totalSizeBytes: 0,
                totalSizeFormatted: '0 B'
            }
        });
    }
});

// Test endpoint for VR app connectivity
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'PicoZen Server API is working',
        timestamp: new Date().toISOString(),
        origin: req.headers.origin || 'none',
        userAgent: req.headers['user-agent'] || 'none',
        endpoints: {
            apps: '/api/apps',
            categories: '/api/categories',
            search: '/api/search',
            download: '/api/download/:id',
            health: '/api/health'
        },
        cors: {
            enabled: true,
            origin: req.headers.origin || 'none'
        }
    });
});

module.exports = router;