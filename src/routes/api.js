const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { getApps, getApp, recordDownload, getCategories } = require('../database');
const { scrapeAppFromUrl } = require('../scrapers');

const router = express.Router();

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
                error: 'Invalid pagination parameters'
            });
        }
        
        const result = await getApps(pageNum, limitNum, category, search);
        
        // Transform data for API response
        const transformedApps = result.apps.map(app => ({
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
            fileSize: app.file_size,
            downloadUrl: `/api/download/${app.id}`,
            iconUrl: app.icon_url,
            featured: Boolean(app.featured),
            createdAt: app.created_at,
            updatedAt: app.updated_at
        }));
        
        res.json({
            success: true,
            apps: transformedApps,
            pagination: result.pagination
        });
        
    } catch (error) {
        console.error('Error fetching apps:', error);
        res.status(500).json({
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
                error: 'Invalid app ID'
            });
        }
        
        const app = await getApp(appId);
        
        if (!app) {
            return res.status(404).json({
                error: 'App not found'
            });
        }
        
        // Transform data for API response
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
            error: 'Failed to fetch app details',
            message: error.message
        });
    }
});

// Download APK file
router.get('/download/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const appId = parseInt(id);
        
        if (isNaN(appId)) {
            return res.status(400).json({
                error: 'Invalid app ID'
            });
        }
        
        const app = await getApp(appId);
        
        if (!app) {
            return res.status(404).json({
                error: 'App not found'
            });
        }
        
        // Record the download
        const clientIp = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');
        
        try {
            await recordDownload(appId, clientIp, userAgent);
        } catch (downloadError) {
            console.error('Error recording download:', downloadError);
            // Don't fail the download if we can't record it
        }
        
        // Handle different download URL types
        if (app.download_url) {
            if (app.download_url.startsWith('http://') || app.download_url.startsWith('https://')) {
                // External URL - redirect
                return res.redirect(app.download_url);
            } else if (app.download_url.startsWith('/')) {
                // Local file path
                const filePath = path.join(__dirname, '..', '..', app.download_url);
                
                try {
                    await fs.access(filePath);
                    
                    // Set appropriate headers
                    res.setHeader('Content-Disposition', `attachment; filename="${app.title.replace(/[^a-zA-Z0-9]/g, '_')}_v${app.version}.apk"`);
                    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
                    
                    if (app.file_size) {
                        res.setHeader('Content-Length', app.file_size);
                    }
                    
                    return res.sendFile(filePath);
                } catch (fileError) {
                    console.error('File not found:', filePath);
                    return res.status(404).json({
                        error: 'APK file not found on server'
                    });
                }
            }
        }
        
        // No valid download URL
        res.status(404).json({
            error: 'Download not available for this app'
        });
        
    } catch (error) {
        console.error('Error downloading app:', error);
        res.status(500).json({
            error: 'Failed to download app',
            message: error.message
        });
    }
});

// Get categories
router.get('/categories', async (req, res) => {
    try {
        const categories = await getCategories();
        
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
                error: 'Search query must be at least 2 characters long'
            });
        }
        
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        
        const result = await getApps(pageNum, limitNum, category, query.trim());
        
        // Transform data for API response
        const transformedApps = result.apps.map(app => ({
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
            downloadUrl: `/api/download/${app.id}`,
            iconUrl: app.icon_url,
            featured: Boolean(app.featured)
        }));
        
        res.json({
            success: true,
            query: query.trim(),
            apps: transformedApps,
            pagination: result.pagination
        });
        
    } catch (error) {
        console.error('Error searching apps:', error);
        res.status(500).json({
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
        
        const result = await getApps(1, limitNum);
        
        // Filter only featured apps
        const featuredApps = result.apps
            .filter(app => app.featured)
            .map(app => ({
                id: app.id,
                packageName: app.package_name,
                title: app.title,
                shortDescription: app.short_description,
                category: app.category,
                developer: app.developer,
                rating: app.rating,
                downloadCount: app.download_count,
                downloadUrl: `/api/download/${app.id}`,
                iconUrl: app.icon_url
            }));
        
        res.json({
            success: true,
            apps: featuredApps
        });
        
    } catch (error) {
        console.error('Error fetching featured apps:', error);
        res.status(500).json({
            error: 'Failed to fetch featured apps',
            message: error.message
        });
    }
});

// Get app statistics
router.get('/stats', async (req, res) => {
    try {
        const { getDB } = require('../database');
        const db = getDB();
        
        // Get various statistics
        const stats = await new Promise((resolve, reject) => {
            const queries = [
                'SELECT COUNT(*) as totalApps FROM apps WHERE active = 1',
                'SELECT COUNT(*) as totalDownloads FROM downloads',
                'SELECT COUNT(DISTINCT category) as totalCategories FROM apps WHERE active = 1',
                'SELECT SUM(file_size) as totalSize FROM apps WHERE active = 1'
            ];
            
            let results = {};
            let completed = 0;
            
            // Total apps
            db.get(queries[0], [], (err, row) => {
                if (err) reject(err);
                results.totalApps = row.totalApps;
                if (++completed === queries.length) resolve(results);
            });
            
            // Total downloads
            db.get(queries[1], [], (err, row) => {
                if (err) reject(err);
                results.totalDownloads = row.totalDownloads;
                if (++completed === queries.length) resolve(results);
            });
            
            // Total categories
            db.get(queries[2], [], (err, row) => {
                if (err) reject(err);
                results.totalCategories = row.totalCategories;
                if (++completed === queries.length) resolve(results);
            });
            
            // Total size
            db.get(queries[3], [], (err, row) => {
                if (err) reject(err);
                results.totalSize = row.totalSize || 0;
                if (++completed === queries.length) resolve(results);
            });
        });
        
        res.json({
            success: true,
            stats: {
                totalApps: stats.totalApps,
                totalDownloads: stats.totalDownloads,
                totalCategories: stats.totalCategories,
                totalSizeBytes: stats.totalSize,
                totalSizeFormatted: formatFileSize(stats.totalSize)
            }
        });
        
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

// Helper function to format file sizes
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

module.exports = router;