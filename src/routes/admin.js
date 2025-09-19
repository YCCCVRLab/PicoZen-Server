const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { addApp, getApp, getApps, getDB } = require('../database');
const { scrapeAppFromUrl, getFileSizeFromUrl, formatFileSize, parseFileSize } = require('../scrapers');

const router = express.Router();

// Simple authentication middleware (in production, use proper JWT)
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    
    const token = authHeader.substring(7);
    if (token !== adminPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    next();
}

// Serve admin interface
router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>PicoZen Admin</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
                .container { max-width: 1200px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 40px; }
                .section { background: #2a2a2a; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
                .form-group { margin-bottom: 15px; }
                label { display: block; margin-bottom: 5px; font-weight: bold; }
                input, textarea, select { width: 100%; padding: 10px; border: 1px solid #444; background: #333; color: white; border-radius: 5px; }
                button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
                button:hover { background: #0056b3; }
                .error { color: #ff6b6b; }
                .success { color: #51cf66; }
                .app-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                .app-card { background: #333; border-radius: 8px; padding: 15px; }
                .app-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                .app-meta { color: #aaa; font-size: 14px; }
                .file-size { color: #4CAF50; font-weight: bold; }
                .tabs { display: flex; margin-bottom: 20px; }
                .tab { padding: 10px 20px; background: #333; border: none; color: white; cursor: pointer; margin-right: 5px; border-radius: 5px 5px 0 0; }
                .tab.active { background: #007bff; }
                .tab-content { display: none; }
                .tab-content.active { display: block; }
                .url-scraper { margin-bottom: 20px; }
                .url-input { display: flex; gap: 10px; }
                .url-input input { flex: 1; }
                .scrape-result { margin-top: 10px; padding: 10px; background: #333; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🛠️ PicoZen Admin Panel</h1>
                    <p>Manage your VR app store</p>
                </div>
                
                <div class="tabs">
                    <button class="tab active" onclick="showTab('scraper')">Add from Store URLs</button>
                    <button class="tab" onclick="showTab('manual')">Manual Add</button>
                    <button class="tab" onclick="showTab('manage')">Manage Apps</button>
                </div>
                
                <!-- URL Scraper Tab -->
                <div id="scraper" class="tab-content active">
                    <div class="section">
                        <h2>🔗 Add Apps from Store URLs</h2>
                        <p>Paste store URLs from Meta Quest Store, SideQuest, or Steam VR. The system will automatically scrape app information, images, and download links.</p>
                        
                        <div class="url-scraper">
                            <div class="url-input">
                                <input type="text" id="storeUrl" placeholder="https://www.oculus.com/experiences/quest/... or https://sidequestvr.com/app/... or https://store.steampowered.com/app/...">
                                <button onclick="scrapeUrl()">Scrape & Add</button>
                            </div>
                            <div id="scrapeStatus"></div>
                            <div id="scrapeResult" class="scrape-result" style="display: none;"></div>
                        </div>
                        
                        <div class="form-group">
                            <label>URLs to Scrape:</label>
                            <textarea id="urlList" rows="5" placeholder="Paste multiple URLs here, one per line..."></textarea>
                        </div>
                        <button onclick="scrapeMultipleUrls()">🔄 Scrape & Add All URLs</button>
                    </div>
                </div>
                
                <!-- Manual Add Tab -->
                <div id="manual" class="tab-content">
                    <div class="section">
                        <h2>📱 Add App Manually</h2>
                        <form id="addAppForm">
                            <div class="form-group">
                                <label>Package Name:</label>
                                <input type="text" id="packageName" required>
                            </div>
                            <div class="form-group">
                                <label>Title:</label>
                                <input type="text" id="title" required>
                            </div>
                            <div class="form-group">
                                <label>Developer:</label>
                                <input type="text" id="developer" required>
                            </div>
                            <div class="form-group">
                                <label>Category:</label>
                                <select id="category">
                                    <option value="Games">Games</option>
                                    <option value="Education">Education</option>
                                    <option value="Productivity">Productivity</option>
                                    <option value="Social">Social</option>
                                    <option value="Health & Fitness">Health & Fitness</option>
                                    <option value="Entertainment">Entertainment</option>
                                    <option value="Tools">Tools</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Version:</label>
                                <input type="text" id="version" placeholder="1.0.0">
                            </div>
                            <div class="form-group">
                                <label>File Size (MB):</label>
                                <input type="number" id="fileSize" step="0.01" placeholder="150.5">
                                <small>Enter size in MB (will be converted to bytes automatically)</small>
                            </div>
                            <div class="form-group">
                                <label>Download URL:</label>
                                <input type="url" id="downloadUrl" placeholder="https://example.com/app.apk">
                            </div>
                            <div class="form-group">
                                <label>Short Description:</label>
                                <textarea id="shortDescription" rows="2"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Full Description:</label>
                                <textarea id="description" rows="4"></textarea>
                            </div>
                            <div class="form-group">
                                <label>Icon Image URL:</label>
                                <input type="url" id="iconUrl" placeholder="https://example.com/icon.png">
                                <small>Provide a direct URL for the icon image.</small>
                            </div>
                            <button type="submit">➕ Add App</button>
                        </form>
                    </div>
                </div>
                
                <!-- Manage Apps Tab -->
                <div id="manage" class="tab-content">
                    <div class="section">
                        <h2>📋 Manage Apps</h2>
                        <button onclick="loadApps()">🔄 Refresh List</button>
                        <div id="appsList"></div>
                    </div>
                </div>
            </div>
            
            <script>
                function showTab(tabName) {
                    // Hide all tabs
                    document.querySelectorAll('.tab-content').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    document.querySelectorAll('.tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    
                    // Show selected tab
                    document.getElementById(tabName).classList.add('active');
                    event.target.classList.add('active');
                    
                    if (tabName === 'manage') {
                        loadApps();
                    }
                }
                
                async function scrapeUrl() {
                    const url = document.getElementById('storeUrl').value.trim();
                    if (!url) {
                        alert('Please enter a URL');
                        return;
                    }
                    
                    const statusDiv = document.getElementById('scrapeStatus');
                    const resultDiv = document.getElementById('scrapeResult');
                    
                    statusDiv.innerHTML = '<div style="color: #ffd43b;">🔄 Scraping URL...</div>';
                    resultDiv.style.display = 'none';
                    
                    try {
                        const response = await fetch('/api/scrape', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ url })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            statusDiv.innerHTML = '<div class="success">✅ Successfully scraped app data!</div>';
                            
                            const data = result.data;
                            resultDiv.innerHTML = \`
                                <h3>\${data.title}</h3>
                                <p><strong>Developer:</strong> \${data.developer}</p>
                                <p><strong>Category:</strong> \${data.category}</p>
                                <p><strong>File Size:</strong> <span class="file-size">\${data.fileSize ? formatFileSize(data.fileSize) : 'Unknown'}</span></p>
                                <p><strong>Description:</strong> \${data.shortDescription}</p>
                                <button onclick="addScrapedApp(\${JSON.stringify(data).replace(/"/g, '&quot;')})">➕ Add This App</button>
                            \`;
                            resultDiv.style.display = 'block';
                        } else {
                            statusDiv.innerHTML = \`<div class="error">❌ Error: \${result.error}</div>\`;
                        }
                    } catch (error) {
                        statusDiv.innerHTML = \`<div class="error">❌ Error: \${error.message}</div>\`;
                    }
                }
                
                async function addScrapedApp(appData) {
                    try {
                        const response = await fetch('/admin/apps', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + (localStorage.getItem('adminPassword') || 'admin123')
                            },
                            body: JSON.stringify(appData)
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            alert('✅ App added successfully!');
                            document.getElementById('scrapeResult').style.display = 'none';
                            document.getElementById('storeUrl').value = '';
                        } else {
                            alert('❌ Error adding app: ' + result.error);
                        }
                    } catch (error) {
                        alert('❌ Error: ' + error.message);
                    }
                }
                
                async function scrapeMultipleUrls() {
                    const urls = document.getElementById('urlList').value
                        .split('\\n')
                        .map(url => url.trim())
                        .filter(url => url);
                    
                    if (urls.length === 0) {
                        alert('Please enter at least one URL');
                        return;
                    }
                    
                    const statusDiv = document.getElementById('scrapeStatus');
                    statusDiv.innerHTML = \`<div style="color: #ffd43b;">🔄 Processing \${urls.length} URLs...</div>\`;
                    
                    let successCount = 0;
                    let errorCount = 0;
                    
                    for (let i = 0; i < urls.length; i++) {
                        const url = urls[i];
                        statusDiv.innerHTML = \`<div style="color: #ffd43b;">🔄 Processing \${i + 1}/\${urls.length}: \${url}</div>\`;
                        
                        try {
                            // Scrape the URL
                            const scrapeResponse = await fetch('/api/scrape', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url })
                            });
                            
                            const scrapeResult = await scrapeResponse.json();
                            
                            if (scrapeResult.success) {
                                // Add the app
                                const addResponse = await fetch('/admin/apps', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': 'Bearer ' + (localStorage.getItem('adminPassword') || 'admin123')
                                    },
                                    body: JSON.stringify(scrapeResult.data)
                                });
                                
                                const addResult = await addResponse.json();
                                
                                if (addResult.success) {
                                    successCount++;
                                } else {
                                    errorCount++;
                                    console.error('Error adding app:', addResult.error);
                                }
                            } else {
                                errorCount++;
                                console.error('Error scraping URL:', scrapeResult.error);
                            }
                        } catch (error) {
                            errorCount++;
                            console.error('Error processing URL:', error);
                        }
                        
                        // Small delay to avoid overwhelming the server
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    statusDiv.innerHTML = \`<div class="success">✅ Completed! \${successCount} apps added successfully, \${errorCount} errors.</div>\`;
                    
                    if (successCount > 0) {
                        document.getElementById('urlList').value = '';
                    }
                }
                
                async function loadApps() {
                    try {
                        const response = await fetch('/api/apps?limit=50');
                        const result = await response.json();
                        
                        if (result.success) {
                            const appsList = document.getElementById('appsList');
                            appsList.innerHTML = \`
                                <div class="app-list">
                                    \${result.apps.map(app => \`
                                        <div class="app-card">
                                            <div class="app-title">\${app.title}</div>
                                            <div class="app-meta">
                                                <div><strong>Developer:</strong> \${app.developer}</div>
                                                <div><strong>Category:</strong> \${app.category}</div>
                                                <div><strong>Downloads:</strong> \${app.downloadCount}</div>
                                                <div><strong>File Size:</strong> <span class="file-size">\${app.fileSizeFormatted || 'Unknown'}</span></div>
                                                <div><strong>Version:</strong> \${app.version || 'N/A'}</div>
                                            </div>
                                        </div>
                                    \`).join('')}
                                </div>
                            \`;
                        } else {
                            document.getElementById('appsList').innerHTML = \`<div class="error">Error loading apps: \${result.error}</div>\`;
                        }
                    } catch (error) {
                        document.getElementById('appsList').innerHTML = \`<div class="error">Error: \${error.message}</div>\`;
                    }
                }
                
                // Manual form submission
                document.getElementById('addAppForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const formData = {
                        packageName: document.getElementById('packageName').value,
                        title: document.getElementById('title').value,
                        developer: document.getElementById('developer').value,
                        category: document.getElementById('category').value,
                        version: document.getElementById('version').value,
                        shortDescription: document.getElementById('shortDescription').value,
                        description: document.getElementById('description').value,
                        downloadUrl: document.getElementById('downloadUrl').value,
                        iconUrl: document.getElementById('iconUrl').value // Now directly from URL
                    };
                    
                    // Convert file size from MB to bytes
                    const fileSizeMB = parseFloat(document.getElementById('fileSize').value);
                    if (fileSizeMB) {
                        formData.fileSize = Math.round(fileSizeMB * 1024 * 1024);
                    }
                    
                    try {
                        const response = await fetch('/admin/apps', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + (localStorage.getItem('adminPassword') || 'admin123')
                            },
                            body: JSON.stringify(formData)
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            alert('✅ App added successfully!');
                            document.getElementById('addAppForm').reset();
                        } else {
                            alert('❌ Error: ' + result.error);
                        }
                    } catch (error) {
                        alert('❌ Error: ' + error.message);
                    }
                });
                
                // Load apps on page load
                loadApps();
            </script>
        </body>
        </html>
    `);
});

// Add new app (from scraped data or manual entry)
router.post('/apps', requireAuth, async (req, res) => {
    try {
        const {
            packageName,
            title,
            description,
            shortDescription,
            version,
            versionCode,
            category,
            developer,
            fileSize,
            downloadUrl,
            iconUrl,
            featured = false
        } = req.body;
        
        // Validate required fields
        if (!packageName || !title || !developer) {
            return res.status(400).json({
                success: false,
                error: 'Package name, title, and developer are required'
            });
        }
        
        // Ensure file size is in bytes
        let fileSizeBytes = null;
        if (fileSize) {
            if (typeof fileSize === 'string') {
                // Try to parse file size string (e.g., "150 MB")
                fileSizeBytes = parseFileSize(fileSize);
                if (!fileSizeBytes) {
                    // If parsing failed, try to convert as number (assume MB)
                    const sizeNum = parseFloat(fileSize);
                    if (!isNaN(sizeNum)) {
                        fileSizeBytes = Math.round(sizeNum * 1024 * 1024);
                    }
                }
            } else if (typeof fileSize === 'number') {
                // If it's already a number, assume it's in bytes
                fileSizeBytes = fileSize;
            }
        }
        
        // If we have a download URL but no file size, try to get it
        if (downloadUrl && !fileSizeBytes) {
            try {
                const urlFileSize = await getFileSizeFromUrl(downloadUrl);
                if (urlFileSize) {
                    fileSizeBytes = urlFileSize;
                    console.log(`Got file size from URL: ${formatFileSize(urlFileSize)}`);
                }
            } catch (sizeError) {
                console.warn('Could not get file size from URL:', sizeError.message);
            }
        }
        
        const appData = {
            packageName,
            title,
            description: description || shortDescription,
            shortDescription: shortDescription || (description ? description.substring(0, 200) + '...' : ''),
            version: version || '1.0.0',
            versionCode: versionCode || 1,
            category: category || 'Games',
            developer,
            fileSize: fileSizeBytes,
            downloadUrl,
            iconUrl
        };
        
        const appId = await addApp(appData);
        
        console.log(`Added app: ${title} (ID: ${appId}) - File size: ${fileSizeBytes ? formatFileSize(fileSizeBytes) : 'Unknown'}`);
        
        res.json({
            success: true,
            appId,
            message: 'App added successfully',
            fileSize: fileSizeBytes,
            fileSizeFormatted: fileSizeBytes ? formatFileSize(fileSizeBytes) : null
        });
        
    } catch (error) {
        console.error('Error adding app:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add app: ' + error.message
        });
    }
});

// Update app
router.put('/apps/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const appId = parseInt(id);
        
        if (isNaN(appId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid app ID'
            });
        }
        
        const updates = req.body;
        
        // Handle file size conversion
        if (updates.fileSize) {
            if (typeof updates.fileSize === 'string') {
                const fileSizeBytes = parseFileSize(updates.fileSize);
                if (fileSizeBytes) {
                    updates.fileSize = fileSizeBytes;
                } else {
                    const sizeNum = parseFloat(updates.fileSize);
                    if (!isNaN(sizeNum)) {
                        updates.fileSize = Math.round(sizeNum * 1024 * 1024); // Assume MB
                    }
                }
            }
        }
        
        const db = getDB();
        const setClause = Object.keys(updates)
            .map(key => `${key} = $1`)
            .join(', ');
        const values = [...Object.values(updates), appId];
        
        // Ensure the correct number of placeholders for PostgreSQL
        const placeholders = values.slice(0, -1).map((_, i) => `$${i + 1}`).join(', ');
        
        await db.query(
            `UPDATE apps SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
            values
        );
        
        res.json({
            success: true,
            message: 'App updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating app:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update app: ' + error.message
        });
    }
});

// Delete app
router.delete('/apps/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const appId = parseInt(id);
        
        if (isNaN(appId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid app ID'
            });
        }
        
        const db = getDB();
        
        await db.query(
            'UPDATE apps SET active = FALSE WHERE id = $1',
            [appId]
        );
        
        res.json({
            success: true,
            message: 'App deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting app:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete app: ' + error.message
        });
    }
});

module.exports = router;