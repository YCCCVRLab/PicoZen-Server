const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { addApp, getApp, getApps, getDB } = require('../database');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'temp');
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit for APK files
    },
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'apk') {
            // APK files
            if (file.mimetype === 'application/vnd.android.package-archive' || 
                file.originalname.toLowerCase().endsWith('.apk')) {
                cb(null, true);
            } else {
                cb(new Error('Only APK files are allowed for app uploads'));
            }
        } else if (file.fieldname === 'icon' || file.fieldname.startsWith('screenshot')) {
            // Image files
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Only image files are allowed for icons and screenshots'));
            }
        } else {
            cb(new Error('Unknown file field'));
        }
    }
});

// Simple authentication middleware (in production, use proper JWT)
const adminAuth = (req, res, next) => {
    const { authorization } = req.headers;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (!authorization || authorization !== `Bearer ${adminPassword}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    next();
};

// Serve admin interface
router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PicoZen Admin Panel</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
                .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
                .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .form-group { margin-bottom: 15px; }
                .form-group label { display: block; margin-bottom: 5px; font-weight: 500; }
                .form-group input, .form-group textarea, .form-group select { 
                    width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; 
                }
                .form-group textarea { min-height: 100px; resize: vertical; }
                .btn { 
                    background: #3498db; color: white; border: none; padding: 12px 24px; 
                    border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;
                }
                .btn:hover { background: #2980b9; }
                .btn-danger { background: #e74c3c; }
                .btn-danger:hover { background: #c0392b; }
                .apps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                .app-card { border: 1px solid #eee; border-radius: 8px; padding: 15px; }
                .app-icon { width: 48px; height: 48px; border-radius: 8px; background: #eee; }
                .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
                .stat-card { text-align: center; padding: 20px; }
                .stat-number { font-size: 2em; font-weight: bold; color: #3498db; }
                .hidden { display: none; }
                .success { color: #27ae60; background: #d5f4e6; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
                .error { color: #e74c3c; background: #fdf2f2; padding: 10px; border-radius: 4px; margin-bottom: 15px; }
                .file-input { border: 2px dashed #ddd; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer; }
                .file-input:hover { border-color: #3498db; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🥽 PicoZen Admin Panel</h1>
                <p>Manage your VR app store</p>
            </div>
            
            <div class="container">
                <div id="auth-section" class="card">
                    <h2>Admin Authentication</h2>
                    <div class="form-group">
                        <label>Admin Password:</label>
                        <input type="password" id="adminPassword" placeholder="Enter admin password">
                    </div>
                    <button class="btn" onclick="authenticate()">Login</button>
                </div>
                
                <div id="admin-content" class="hidden">
                    <div class="stats">
                        <div class="card stat-card">
                            <div class="stat-number" id="totalApps">0</div>
                            <div>Total Apps</div>
                        </div>
                        <div class="card stat-card">
                            <div class="stat-number" id="totalDownloads">0</div>
                            <div>Total Downloads</div>
                        </div>
                        <div class="card stat-card">
                            <div class="stat-number" id="totalCategories">0</div>
                            <div>Categories</div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h2>Add New App</h2>
                        <div id="message"></div>
                        <form id="appForm" enctype="multipart/form-data">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                <div>
                                    <div class="form-group">
                                        <label>App Title *</label>
                                        <input type="text" name="title" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Package Name *</label>
                                        <input type="text" name="packageName" placeholder="com.example.app" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Developer *</label>
                                        <input type="text" name="developer" required>
                                    </div>
                                    <div class="form-group">
                                        <label>Version</label>
                                        <input type="text" name="version" placeholder="1.0.0">
                                    </div>
                                    <div class="form-group">
                                        <label>Category</label>
                                        <select name="category">
                                            <option value="Games">Games</option>
                                            <option value="Education">Education</option>
                                            <option value="Productivity">Productivity</option>
                                            <option value="Social">Social</option>
                                            <option value="Health & Fitness">Health & Fitness</option>
                                            <option value="Entertainment">Entertainment</option>
                                            <option value="Tools">Tools</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <div class="form-group">
                                        <label>Short Description</label>
                                        <textarea name="shortDescription" placeholder="Brief description (max 500 chars)"></textarea>
                                    </div>
                                    <div class="form-group">
                                        <label>Full Description</label>
                                        <textarea name="description" placeholder="Detailed description"></textarea>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                                <div class="form-group">
                                    <label>App Icon</label>
                                    <div class="file-input" onclick="document.getElementById('iconFile').click()">
                                        <input type="file" id="iconFile" name="icon" accept="image/*" style="display: none;" onchange="updateFileName('iconFile', 'iconFileName')">
                                        <div id="iconFileName">Click to select app icon</div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>APK File</label>
                                    <div class="file-input" onclick="document.getElementById('apkFile').click()">
                                        <input type="file" id="apkFile" name="apk" accept=".apk" style="display: none;" onchange="updateFileName('apkFile', 'apkFileName')">
                                        <div id="apkFileName">Click to select APK file</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group" style="margin-top: 20px;">
                                <label>
                                    <input type="checkbox" name="featured"> Featured App
                                </label>
                            </div>
                            
                            <button type="submit" class="btn">Add App</button>
                        </form>
                    </div>
                    
                    <div class="card">
                        <h2>Existing Apps</h2>
                        <div id="appsGrid" class="apps-grid">
                            <p>Loading apps...</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                let authToken = null;
                
                function authenticate() {
                    const password = document.getElementById('adminPassword').value;
                    authToken = 'Bearer ' + password;
                    
                    // Test authentication by fetching stats
                    fetch('/api/stats', {
                        headers: { 'Authorization': authToken }
                    })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            document.getElementById('auth-section').classList.add('hidden');
                            document.getElementById('admin-content').classList.remove('hidden');
                            loadDashboard();
                        } else {
                            alert('Invalid password');
                        }
                    })
                    .catch(err => {
                        alert('Authentication failed');
                    });
                }
                
                function loadDashboard() {
                    // Load statistics
                    fetch('/api/stats')
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                document.getElementById('totalApps').textContent = data.stats.totalApps;
                                document.getElementById('totalDownloads').textContent = data.stats.totalDownloads;
                                document.getElementById('totalCategories').textContent = data.stats.totalCategories;
                            }
                        });
                    
                    // Load apps
                    loadApps();
                }
                
                function loadApps() {
                    fetch('/api/apps?limit=50')
                        .then(r => r.json())
                        .then(data => {
                            const grid = document.getElementById('appsGrid');
                            if (data.success && data.apps.length > 0) {
                                grid.innerHTML = data.apps.map(app => \`
                                    <div class="app-card">
                                        <img src="\${app.iconUrl || '/images/default-icon.png'}" class="app-icon" onerror="this.src='/images/default-icon.png'">
                                        <h3>\${app.title}</h3>
                                        <p><strong>Developer:</strong> \${app.developer}</p>
                                        <p><strong>Category:</strong> \${app.category}</p>
                                        <p><strong>Downloads:</strong> \${app.downloadCount}</p>
                                        <p><strong>Version:</strong> \${app.version || 'N/A'}</p>
                                        \${app.featured ? '<p style="color: #f39c12;"><strong>⭐ Featured</strong></p>' : ''}
                                        <button class="btn btn-danger" onclick="deleteApp(\${app.id})">Delete</button>
                                    </div>
                                \`).join('');
                            } else {
                                grid.innerHTML = '<p>No apps found. Add some apps to get started!</p>';
                            }
                        });
                }
                
                function updateFileName(inputId, displayId) {
                    const input = document.getElementById(inputId);
                    const display = document.getElementById(displayId);
                    display.textContent = input.files[0] ? input.files[0].name : 'No file selected';
                }
                
                document.getElementById('appForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(e.target);
                    const messageDiv = document.getElementById('message');
                    
                    messageDiv.innerHTML = '<div style="color: #3498db;">Uploading app...</div>';
                    
                    try {
                        const response = await fetch('/admin/apps', {
                            method: 'POST',
                            headers: { 'Authorization': authToken },
                            body: formData
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            messageDiv.innerHTML = '<div class="success">App added successfully!</div>';
                            e.target.reset();
                            document.getElementById('iconFileName').textContent = 'Click to select app icon';
                            document.getElementById('apkFileName').textContent = 'Click to select APK file';
                            loadApps();
                            loadDashboard();
                        } else {
                            messageDiv.innerHTML = \`<div class="error">Error: \${result.error}</div>\`;
                        }
                    } catch (error) {
                        messageDiv.innerHTML = \`<div class="error">Upload failed: \${error.message}</div>\`;
                    }
                });
                
                function deleteApp(appId) {
                    if (confirm('Are you sure you want to delete this app?')) {
                        fetch(\`/admin/apps/\${appId}\`, {
                            method: 'DELETE',
                            headers: { 'Authorization': authToken }
                        })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                loadApps();
                                loadDashboard();
                            } else {
                                alert('Failed to delete app: ' + data.error);
                            }
                        });
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// Add new app
router.post('/apps', adminAuth, upload.fields([
    { name: 'apk', maxCount: 1 },
    { name: 'icon', maxCount: 1 },
    { name: 'screenshots', maxCount: 10 }
]), async (req, res) => {
    try {
        const {
            title,
            packageName,
            description,
            shortDescription,
            version,
            versionCode,
            category,
            developer,
            featured
        } = req.body;
        
        // Validate required fields
        if (!title || !packageName || !developer) {
            return res.status(400).json({
                error: 'Title, package name, and developer are required'
            });
        }
        
        let iconUrl = null;
        let downloadUrl = null;
        let fileSize = 0;
        
        // Process uploaded files
        if (req.files) {
            // Process APK file
            if (req.files.apk && req.files.apk[0]) {
                const apkFile = req.files.apk[0];
                const apkDir = path.join(__dirname, '..', '..', 'uploads', 'files');
                await fs.mkdir(apkDir, { recursive: true });
                
                const apkFileName = `${packageName}_v${version || '1.0.0'}.apk`;
                const apkPath = path.join(apkDir, apkFileName);
                
                await fs.rename(apkFile.path, apkPath);
                downloadUrl = `/files/${apkFileName}`;
                fileSize = apkFile.size;
            }
            
            // Process icon
            if (req.files.icon && req.files.icon[0]) {
                const iconFile = req.files.icon[0];
                const iconDir = path.join(__dirname, '..', '..', 'uploads', 'images', 'icons');
                await fs.mkdir(iconDir, { recursive: true });
                
                const iconFileName = `${packageName}_icon.png`;
                const iconPath = path.join(iconDir, iconFileName);
                
                // Resize and optimize icon
                await sharp(iconFile.path)
                    .resize(512, 512, { fit: 'cover' })
                    .png({ quality: 90 })
                    .toFile(iconPath);
                
                iconUrl = `/images/icons/${iconFileName}`;
                
                // Clean up temp file
                await fs.unlink(iconFile.path);
            }
        }
        
        // Add app to database
        const appId = await addApp({
            packageName,
            title,
            description,
            shortDescription,
            version,
            versionCode: versionCode ? parseInt(versionCode) : null,
            category,
            developer,
            fileSize,
            downloadUrl,
            iconUrl
        });
        
        // Set featured status if specified
        if (featured === 'on') {
            const { getDB } = require('../database');
            const db = getDB();
            db.run('UPDATE apps SET featured = 1 WHERE id = ?', [appId]);
        }
        
        res.json({
            success: true,
            appId,
            message: 'App added successfully'
        });
        
    } catch (error) {
        console.error('Error adding app:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            for (const fieldFiles of Object.values(req.files)) {
                for (const file of fieldFiles) {
                    try {
                        await fs.unlink(file.path);
                    } catch (unlinkError) {
                        console.error('Error cleaning up file:', unlinkError);
                    }
                }
            }
        }
        
        res.status(500).json({
            error: 'Failed to add app',
            message: error.message
        });
    }
});

// Delete app
router.delete('/apps/:id', adminAuth, async (req, res) => {
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
        
        const { getDB } = require('../database');
        const db = getDB();
        
        // Delete app from database
        db.run('DELETE FROM apps WHERE id = ?', [appId], function(err) {
            if (err) {
                console.error('Error deleting app:', err);
                return res.status(500).json({
                    error: 'Failed to delete app'
                });
            }
            
            // TODO: Clean up associated files
            
            res.json({
                success: true,
                message: 'App deleted successfully'
            });
        });
        
    } catch (error) {
        console.error('Error deleting app:', error);
        res.status(500).json({
            error: 'Failed to delete app',
            message: error.message
        });
    }
});

module.exports = router;