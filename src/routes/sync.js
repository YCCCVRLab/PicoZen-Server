const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Import sync functions
const {
  syncAirtableToNeon,
  syncNeonToAirtable,
  getSyncStatus,
  convertAirtableToNeon,
  FIELD_MAPPING,
  CATEGORY_MAPPING
} = require('../../scripts/sync-airtable');

// Import database helpers
const database = require('../database');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
  dest: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// Enhanced CORS for sync endpoints
router.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

/**
 * GET /api/sync/status
 * Get sync status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Getting sync status...');
    
    const status = await getSyncStatus(database.dbHelpers);
    
    res.json({
      success: true,
      ...status,
      endpoints: {
        'airtable-to-neon': 'POST /api/sync/airtable-to-neon',
        'neon-to-airtable': 'GET /api/sync/neon-to-airtable', 
        'upload-csv': 'POST /api/sync/upload-csv',
        'field-mapping': 'GET /api/sync/field-mapping'
      }
    });
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * GET /api/sync/field-mapping
 * Get field mapping configuration
 */
router.get('/field-mapping', (req, res) => {
  res.json({
    success: true,
    fieldMapping: FIELD_MAPPING,
    categoryMapping: CATEGORY_MAPPING,
    description: 'Field mapping between AItable and Neon database'
  });
});

/**
 * POST /api/sync/airtable-to-neon
 * Sync from AItable CSV to Neon database
 */
router.post('/airtable-to-neon', async (req, res) => {
  try {
    console.log('🔄 Starting AItable -> Neon sync...');
    
    const { csvData } = req.body;
    
    if (!csvData) {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required',
        usage: 'POST with JSON body: { "csvData": "csv content string" }'
      });
    }
    
    // Perform sync
    const result = await syncAirtableToNeon(csvData, database.dbHelpers);
    
    res.json({
      success: true,
      message: 'AItable -> Neon sync completed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AItable -> Neon sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/sync/upload-csv  
 * Upload CSV file and sync to Neon
 */
router.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  try {
    console.log('📁 Processing uploaded CSV file...');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file uploaded',
        usage: 'POST with multipart/form-data and csvFile field'
      });
    }
    
    // Read uploaded file
    const csvContent = await fs.readFile(req.file.path, 'utf-8');
    
    // Clean up uploaded file
    await fs.unlink(req.file.path).catch(err => console.warn('Could not delete temp file:', err));
    
    // Perform sync
    const result = await syncAirtableToNeon(csvContent, database.dbHelpers);
    
    res.json({
      success: true,
      message: 'CSV uploaded and synced successfully',
      filename: req.file.originalname,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('CSV upload sync failed:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(err => console.warn('Could not delete temp file:', err));
    }
    
    res.status(500).json({
      success: false,
      error: 'CSV sync failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/sync/neon-to-airtable
 * Export Neon database to AItable CSV format
 */
router.get('/neon-to-airtable', async (req, res) => {
  try {
    console.log('📤 Exporting Neon -> AItable...');
    
    const result = await syncNeonToAirtable(database.dbHelpers);
    
    if (req.query.format === 'csv') {
      // Return as CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="neon-to-airtable.csv"');
      
      // Convert data to CSV string
      const csvLines = [];
      const headers = ['Name', 'Image', 'Installed', 'Description', 'Tags', 'Requires Update', 'ImageURL', 'Package Name'];
      csvLines.push(headers.join(','));
      
      for (const app of result.data) {
        const row = headers.map(header => {
          const value = app[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          return value.toString().includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvLines.push(row.join(','));
      }
      
      res.send(csvLines.join('\n'));
    } else {
      // Return as JSON
      res.json({
        success: true,
        message: 'Neon -> AItable export completed successfully',
        ...result,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Neon -> AItable export failed:', error);
    res.status(500).json({
      success: false,
      error: 'Export failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/sync/test-conversion
 * Test data conversion without actually syncing
 */
router.post('/test-conversion', async (req, res) => {
  try {
    console.log('🧪 Testing data conversion...');
    
    const { csvData, direction = 'airtable-to-neon' } = req.body;
    
    if (!csvData) {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required for testing'
      });
    }
    
    if (direction === 'airtable-to-neon') {
      // Parse CSV and convert
      const csv = require('csv-parser');
      const stream = require('stream');
      
      const results = [];
      const readable = new stream.Readable();
      readable.push(csvData);
      readable.push(null);
      
      await new Promise((resolve, reject) => {
        readable
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      
      const converted = convertAirtableToNeon(results);
      
      res.json({
        success: true,
        message: 'Conversion test completed',
        direction: 'AItable -> Neon',
        input: {
          count: results.length,
          sample: results.slice(0, 2)
        },
        output: {
          count: converted.length,
          sample: converted.slice(0, 2)
        },
        fieldMapping: FIELD_MAPPING.airtableToNeon
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Only airtable-to-neon direction supported for testing currently'
      });
    }
    
  } catch (error) {
    console.error('Conversion test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Conversion test failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/sync/reset
 * Reset all apps in Neon database (dangerous!)
 */
router.delete('/reset', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'RESET_ALL_APPS') {
      return res.status(400).json({
        success: false,
        error: 'Confirmation required',
        message: 'Send { "confirm": "RESET_ALL_APPS" } to confirm reset'
      });
    }
    
    console.log('⚠️  Resetting all apps in database...');
    
    // Get all apps and delete them
    const result = await database.dbHelpers.getApps(1, 1000);
    let deletedCount = 0;
    
    for (const app of result.apps) {
      try {
        await database.dbHelpers.deleteApp(app.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete app ${app.id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: 'Database reset completed',
      deletedApps: deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database reset failed:', error);
    res.status(500).json({
      success: false,
      error: 'Reset failed',
      message: error.message
    });
  }
});

module.exports = router;