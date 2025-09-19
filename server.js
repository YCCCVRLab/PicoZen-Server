const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDatabase, getDB } = require('./src/database');
const apiRoutes = require('./src/routes/api');
const adminRoutes = require('./src/routes/admin');
const { errorHandler, notFound } = require('./src/middleware/errorHandlers');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Allow inline scripts for admin panel
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://ycccrlab.github.io', 'https://picozen.app']
        : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Static file serving
app.use('/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/files', express.static(path.join(__dirname, 'uploads/files')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Serve the main store interface
app.get('/', async (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'public', 'index.html');
        const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
        
        if (indexExists) {
            res.sendFile(indexPath);
        } else {
            // Serve a basic store interface if index.html doesn't exist
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PicoZen App Store</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
                        .header { text-align: center; margin-bottom: 40px; }
                        .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                        .app-card { background: #2a2a2a; border-radius: 10px; padding: 20px; }
                        .app-icon { width: 64px; height: 64px; border-radius: 10px; background: #444; }
                        .app-title { font-size: 18px; font-weight: bold; margin: 10px 0 5px 0; }
                        .app-developer { color: #aaa; margin-bottom: 10px; }
                        .app-description { color: #ccc; line-height: 1.4; }
                        .download-btn { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>🥽 PicoZen App Store</h1>
                        <p>VR Applications for PICO and Quest Headsets</p>
                    </div>
                    <div id="apps-container">
                        <div class="apps-grid" id="apps-grid">
                            <p>Loading apps...</p>
                        </div>
                    </div>
                    <script>
                        fetch('/api/apps')
                            .then(r => r.json())
                            .then(data => {
                                const grid = document.getElementById('apps-grid');
                                if (data.apps && data.apps.length > 0) {
                                    grid.innerHTML = data.apps.map(app => \`
                                        <div class="app-card">
                                            <img class="app-icon" src="\${app.iconUrl || '/images/default-icon.png'}" alt="\${app.title}" onerror="this.src='/images/default-icon.png'">
                                            <div class="app-title">\${app.title}</div>
                                            <div class="app-developer">\${app.developer}</div>
                                            <div class="app-description">\${app.shortDescription || app.description || 'No description available'}</div>
                                            <button class="download-btn" onclick="downloadApp(\${app.id})">Download APK</button>
                                        </div>
                                    \`).join('');
                                } else {
                                    grid.innerHTML = '<p>No apps available. <a href="/admin" style="color: #007bff;">Add some apps</a> to get started!</p>';
                                }
                            })
                            .catch(err => {
                                document.getElementById('apps-grid').innerHTML = '<p>Error loading apps: ' + err.message + '</p>';
                            });
                        
                        function downloadApp(appId) {
                            window.open('/api/download/' + appId, '_blank');
                        }
                    </script>
                </body>
                </html>
            `);
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: require('./package.json').version
    });
});

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
    try {
        await initDatabase();
        console.log('✅ Database initialized successfully');
        
        // Ensure upload directories exist
        const uploadDirs = ['uploads/images', 'uploads/files', 'uploads/temp'];
        for (const dir of uploadDirs) {
            await fs.mkdir(path.join(__dirname, dir), { recursive: true });
        }
        console.log('✅ Upload directories created');
        
        app.listen(PORT, () => {
            console.log(`🚀 PicoZen Server running on port ${PORT}`);
            console.log(`📱 Store interface: http://localhost:${PORT}`);
            console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin`);
            console.log(`🔌 API endpoints: http://localhost:${PORT}/api`);
            
            if (process.env.NODE_ENV !== 'production') {
                console.log('🔧 Development mode - CORS enabled for all origins');
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔄 Received SIGINT, shutting down gracefully');
    process.exit(0);
});

startServer();