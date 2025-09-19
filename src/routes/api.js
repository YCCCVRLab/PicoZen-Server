const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
// Import the entire database module, then access dbHelpers
const database = require('../database'); 
const { scrapeAppFromUrl, getFileSizeFromUrl, formatFileSize, parseFileSize } = require('../scrapers');

const router = express.Router();

// Add CORS headers for VR app compatibility
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type', 'Accept', 'Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Health check endpoint for VR app connectivity
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'ok',
        timestamp: new Date().toISOString(),
        server: 'PicoZen-Server',
        version: '1.0.0'
    });
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
        
        // Access getApps from database.dbHelpers
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
                categoryName: app.category_name,
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
        
        res.json({
            success: true,
            apps: transformedApps,
            pagination: result.pagination
        });
        
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch apps',
            message: error.message
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
        
        // Access getApp from database.dbHelpers
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
        
        // Access getApp from database.dbHelpers
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
            // Access recordDownload from database.dbHelpers
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
            }\n        }\n        
        // No valid download URL\n        res.status(404).json({
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
        // Access getCategories from database.dbHelpers
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
        res.status(500).json({
            success: false,
            error: 'Failed to fetch categories',
            message: error.message
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
        
        // Access getApps from database.dbHelpers
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
        res.status(500).json({
            success: false,
            error: 'Search failed',
            message: error.message
        });
    }
});

// Get featured apps
router.get('/featured', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const limitNum = parseInt(limit);
        
        // Access getApps from database.dbHelpers
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
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured apps',
            message: error.message
        });
    }
});

// Get app statistics
router.get('/stats', async (req, res) => {
    try {
        const db = database.getDB(); // Access getDB from the module
        
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
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// Test endpoint for VR app connectivity
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'PicoZen Server API is working',
        timestamp: new Date().toISOString(),
        endpoints: {
            apps: '/api/apps',
            categories: '/api/categories',
            search: '/api/search',
            download: '/api/download/:id',
            health: '/api/health'
        }
    });
});

module.exports = router;