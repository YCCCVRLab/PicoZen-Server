const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const database = require('./src/database'); // Import the entire module
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');
const { errorHandler, notFound } = require('./src/middleware/errorHandlers');

const app = express();
const PORT = process.env.PORT || 3000; // Use PORT environment variable for Vercel

// IMPORTANT: Trust proxy headers for Vercel deployment
app.set('trust proxy', true); // Set to true to trust all proxies (safe in Vercel)

// Database initialization
let dbInitialized = false;

async function ensureDatabase() {
    if (!dbInitialized) {
        try {
            console.log('🔄 Initializing database...');
            await database.initDatabase(); // Call initDatabase from the module
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

// Enhanced CORS configuration for GitHub Pages and local development
const corsOptions = {
    origin: [
        'https://ycccrlab.github.io',
        'https://ycccrlab.github.io/PicoZen-Web',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        // Allow any localhost for development
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'Cache-Control',
        'X-Forwarded-For',
        'X-Real-IP'
    ],
    optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
    const origin = req.headers.origin;
    
    // Check if origin is allowed
    let allowedOrigin = '*';
    if (corsOptions.origin.includes(origin)) {
        allowedOrigin = origin;
    } else {
        // Check regex patterns for localhost
        for (const pattern of corsOptions.origin) {
            if (pattern instanceof RegExp && pattern.test(origin)) {
                allowedOrigin = origin;
                break;
            }
        }
    }
    
    res.header('Access-Control-Allow-Origin', allowedOrigin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.sendStatus(200);
});

// Add additional CORS headers for all responses
app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    if (origin && corsOptions.origin.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else {
        // Check regex patterns for localhost
        for (const pattern of corsOptions.origin) {
            if (pattern instanceof RegExp && pattern.test(origin)) {
                res.header('Access-Control-Allow-Origin', origin);
                break;
            }
        }
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.path === '/api/health' || req.path === '/health';
    }
});
app.use(limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'PicoZen-Server-Vercel',
        version: '1.0.1',
        database: dbInitialized ? 'ready' : 'initializing',
        cors: 'enabled'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true,
        status: 'ok', 
        timestamp: new Date().toISOString(),
        server: 'PicoZen-Server-Vercel',
        version: '1.0.1',
        database: dbInitialized ? 'ready' : 'initializing',
        cors: 'enabled'
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'PicoZen Server is running on Vercel!',
        timestamp: new Date().toISOString(),
        platform: 'Vercel Server',
        endpoints: {
            health: '/health',
            apps: '/apps',
            categories: '/categories',
            search: '/search',
            admin: '/admin'
        },
        cors: {
            enabled: true,
            allowedOrigins: corsOptions.origin.filter(o => typeof o === 'string'),
            requestOrigin: req.headers.origin || 'none'
        },
        database: dbInitialized ? 'connected' : 'connecting'
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'PicoZen Server API is working on Vercel!',
        timestamp: new Date().toISOString(),
        platform: 'Vercel Server',
        endpoints: {
            health: '/api/health',
            apps: '/api/apps',
            categories: '/api/categories',
            search: '/api/search',
            admin: '/admin'
        },
        cors: {
            enabled: true,
            allowedOrigins: corsOptions.origin.filter(o => typeof o === 'string'),
            requestOrigin: req.headers.origin || 'none'
        },
        database: dbInitialized ? 'connected' : 'connecting'
    });
});

// Database initialization middleware
app.use(async (req, res, next) => {
    try {
        await ensureDatabase();
        next();
    } catch (error) {
        console.error('Database middleware error:', error);
        next();
    }
});

// Static file serving for uploads (if needed, adjust paths)
app.use('/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/files', express.static(path.join(__dirname, 'uploads/files')));

// API Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Direct routes (without /api prefix)
app.use('/', apiRoutes);

// Root endpoint - serve store interface
app.get('/', async (req, res) => {
    try {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>🥽 PicoZen VR App Store</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #0c0c0c 0%, #1a1a2e 50%, #16213e 100%);
                        color: #ffffff; min-height: 100vh; display: flex; flex-direction: column;
                    }
                    .container { max-width: 1200px; margin: 0 auto; padding: 40px 20px; flex: 1; }
                    .header { text-align: center; margin-bottom: 60px; }
                    .logo { font-size: 4rem; margin-bottom: 20px; }
                    .title { 
                        font-size: 3.5rem; font-weight: 700; margin-bottom: 15px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .subtitle { font-size: 1.3rem; color: #b3b3b3; margin-bottom: 30px; }
                    .status-card { 
                        background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px);
                        border-radius: 20px; padding: 40px; margin: 30px 0; 
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    }
                    .status-header { display: flex; align-items: center; justify-content: center; margin-bottom: 25px; }
                    .status-icon { font-size: 2rem; margin-right: 15px; }
                    .status-title { font-size: 1.8rem; font-weight: 600; }
                    .badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 25px 0; }
                    .badge { 
                        background: linear-gradient(135deg, #4CAF50, #45a049);
                        color: white; padding: 8px 16px; border-radius: 25px; 
                        font-size: 0.9rem; font-weight: 500;
                    }
                    .endpoints { text-align: left; max-width: 600px; margin: 30px auto; }
                    .endpoints h4 { color: #667eea; margin-bottom: 20px; font-size: 1.2rem; }
                    .endpoint { 
                        background: rgba(0, 0, 0, 0.3); padding: 12px 20px; margin: 8px 0; 
                        border-radius: 10px; font-family: 'Monaco', 'Menlo', monospace; 
                        font-size: 0.95rem; border-left: 4px solid #667eea;
                    }
                    .actions { text-align: center; margin: 40px 0; }
                    .btn { 
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white; border: none; padding: 15px 30px; 
                        border-radius: 12px; cursor: pointer; text-decoration: none; 
                        display: inline-block; margin: 10px; font-size: 1rem; font-weight: 500;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .btn:hover { 
                        transform: translateY(-2px); 
                        box-shadow: 0 10px 25px rgba(102, 126, 234, 0.4);
                    }
                    .footer { 
                        text-align: center; padding: 40px 20px; 
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                        background: rgba(0, 0, 0, 0.2);
                    }
                    .footer h3 { color: #667eea; margin-bottom: 10px; }
                    .footer p { color: #888; margin: 5px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="logo">🥽</div>
                        <h1 class="title">PicoZen Server</h1>
                        <p class="subtitle">VR App Store Backend - Running on Vercel!</p>
                    </div>
                    
                    <div class="status-card">
                        <div class="status-header">
                            <span class="status-icon">✅</span>
                            <span class="status-title">Server Online & CORS Fixed</span>
                        </div>
                        
                        <div class="badges">
                            <div class="badge">🚀 Vercel Server</div>
                            <div class="badge">🌐 CORS Enabled</div>
                            <div class="badge">🥽 VR Compatible</div>
                            <div class="badge">🔄 Auto-Scaling</div>
                        </div>
                        
                        <div class="endpoints">
                            <h4>📡 API Endpoints Available:</h4>
                            <div class="endpoint">GET /api/health - Server Health Check</div>
                            <div class="endpoint">GET /api/apps - List VR Applications</div>
                            <div class="endpoint">GET /api/categories - App Categories</div>
                            <div class="endpoint">GET /api/test - Connection Test</div>
                            <div class="endpoint">GET /admin - Admin Management Panel</div>
                        </div>
                    </div>
                    
                    <div class="actions">
                        <a href="/admin" class="btn">🛠️ Admin Panel</a>
                        <a href="/api/apps" class="btn">📱 View Apps JSON</a>
                        <a href="/api/health" class="btn">💚 Health Check</a>
                        <a href="/api/test" class="btn">🧪 Test Endpoint</a>
                    </div>
                </div>
                
                <div class="footer">
                    <h3>YCCC VR Lab</h3>
                    <p>Room 112, Wells Campus</p>
                    <p>Building the Future of VR Education 🎓</p>
                </div>
                
                <script>
                    // Test server connectivity on page load
                    console.log('🔄 Testing PicoZen Server connectivity...');
                    
                    Promise.all([
                        fetch('/api/health').then(r => r.json()),
                        fetch('/api/test').then(r => r.json()),
                        fetch('/api/apps').then(r => r.json())
                    ])
                    .then(([health, test, apps]) => {
                        console.log('✅ Health Check:', health);
                        console.log('✅ Test Endpoint:', test);
                        console.log('✅ Apps API:', apps);
                        console.log('🎉 PicoZen Server is fully operational on Vercel!');
                    })
                    .catch(err => {
                        console.error('❌ Server connectivity test failed:', err);
                    });
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Server error',
            message: error.message 
        });
    }
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Start server if not in Vercel environment (local dev)
if (!process.env.VERCEL) {
    async function startLocalServer() {
        try {
            await ensureDatabase();
            
            app.listen(PORT, () => {
                console.log(`🚀 PicoZen Server running on port ${PORT}`);
                console.log(`📱 Store interface: http://localhost:${PORT}`);
                console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin`);
                console.log(`🔌 API endpoints: http://localhost:${PORT}/api`);
                console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
                console.log(`🌐 CORS enabled for GitHub Pages and localhost`);
            });
        } catch (error) {
            console.error('❌ Failed to start local server:', error);
            process.exit(1);
        }
    }
    startLocalServer();
}

// Export app for Vercel deployment (if VERCEL environment variable is set)
module.exports = app;