const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');

// Import modules (adjust paths for api directory)
const database = require('../src/database'); // Import the entire database module
const apiRoutes = require('../src/routes/api');
const adminRoutes = require('../src/routes/admin');
const { errorHandler, notFound } = require('../src/middleware/errorHandlers');

const app = express();

// Database initialization for serverless
let dbInitialized = false;

async function ensureDatabase() {
    if (!dbInitialized) {
        try {
            console.log('🔄 Initializing database for Vercel...');
            await database.initDatabase(); // Call from the database module
            console.log('✅ Database initialized successfully');
            dbInitialized = true;
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            // Don't throw error, let the app start and retry on next request
        }
    }
}

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
}));

// Enhanced CORS configuration for VR app compatibility
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
});

// Compression and logging
app.use(compression());
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased for VR app usage
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Initialize database middleware
app.use(async (req, res, next) => {
    await ensureDatabase();
    next();
});

// Static file serving
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'PicoZen Server API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            apps: '/api/apps',
            categories: '/api/categories',
            search: '/api/search',
            admin: '/admin',
            docs: 'https://github.com/YCCCVRLab/PicoZen-Server'
        }
    });
});

// API Routes
app.use('/api', apiRoutes);

// Admin Routes  
app.use('/admin', adminRoutes);

// Serve a basic web interface
app.get('/store', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PicoZen VR App Store</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: white; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 40px; }
                .logo { font-size: 48px; font-weight: bold; color: #00d4ff; margin-bottom: 10px; }
                .tagline { font-size: 18px; color: #888; }
                .section { background: #1a1a1a; border-radius: 10px; padding: 30px; margin-bottom: 20px; }
                .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 30px; }
                .feature { background: #2a2a2a; padding: 20px; border-radius: 8px; }
                .feature h3 { color: #00d4ff; margin-bottom: 10px; }
                .api-endpoint { background: #333; padding: 10px; border-radius: 5px; font-family: monospace; margin: 5px 0; }
                .btn { display: inline-block; background: #00d4ff; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 10px 5px; }
                .btn:hover { background: #00b8e6; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">PicoZen</div>
                    <div class="tagline">VR App Store Backend Server</div>
                </div>
                
                <div class="section">
                    <h2>🚀 Server Status: Online</h2>
                    <p>Welcome to the PicoZen VR App Store backend server. This API powers VR app distribution for Quest, Pico, and other VR headsets.</p>
                    
                    <a href="/api/health" class="btn">Health Check</a>
                    <a href="/api/apps" class="btn">Browse Apps</a>
                    <a href="/admin" class="btn">Admin Panel</a>
                </div>
                
                <div class="feature-grid">
                    <div class="feature">
                        <h3>📱 VR App Management</h3>
                        <p>Complete app store backend with metadata, screenshots, and download tracking.</p>
                        <div class="api-endpoint">GET /api/apps</div>
                        <div class="api-endpoint">GET /api/apps/:id</div>
                    </div>
                    
                    <div class="feature">
                        <h3>🔍 Search & Discovery</h3>
                        <p>Powerful search and category filtering for VR applications.</p>
                        <div class="api-endpoint">GET /api/search?q=game</div>
                        <div class="api-endpoint">GET /api/categories</div>
                    </div>
                    
                    <div class="feature">
                        <h3>📊 Analytics & Stats</h3>
                        <p>Download tracking and usage statistics for developers.</p>
                        <div class="api-endpoint">GET /api/stats</div>
                        <div class="api-endpoint">GET /api/download/:id</div>
                    </div>
                    
                    <div class="feature">
                        <h3>🛠️ Admin Interface</h3>
                        <p>Web-based admin panel for managing the app catalog.</p>
                        <div class="api-endpoint">POST /admin/apps</div>
                        <div class="api-endpoint">PUT /admin/apps/:id</div>
                    </div>
                </div>
                
                <div class="section">
                    <h3>🔗 Integration</h3>
                    <p>This server integrates with:</p>
                    <ul>
                        <li><strong>VR Headsets:</strong> Quest, Pico, HTC Vive, etc.</li>
                        <li><strong>Sideloading Tools:</strong> ADB, SideQuest integration</li>
                        <li><strong>Web Interface:</strong> Desktop/mobile app browsing</li>
                        <li><strong>Developer Tools:</strong> App submission and analytics</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// For Vercel serverless functions
module.exports = app;

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 PicoZen Server running on port ${PORT}`);
        console.log(`📱 VR App Store API: http://localhost:${PORT}/api`);
        console.log(`🛠️ Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`🌐 Web Interface: http://localhost:${PORT}/store`);
    });
}