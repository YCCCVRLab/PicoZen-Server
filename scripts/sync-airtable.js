#!/usr/bin/env node

/**
 * AItable ↔ Neon Database Sync System
 * Enables bi-directional synchronization between AItable CSV and Neon PostgreSQL
 */

const path = require('path');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

// Field mapping configuration
const FIELD_MAPPING = {
  // AItable -> Neon mapping
  airtableToNeon: {
    'Name': 'title',
    'Package Name': 'package_name', 
    'Description': 'description',
    'ImageURL': 'icon_url',
    'Tags': 'category',
    'Installed': 'featured'
  },
  // Neon -> AItable mapping  
  neonToAirtable: {
    'title': 'Name',
    'package_name': 'Package Name',
    'description': 'Description', 
    'icon_url': 'ImageURL',
    'category': 'Tags',
    'featured': 'Installed'
  }
};

// Category mapping for Tags -> Category conversion
const CATEGORY_MAPPING = {
  'Science': 'Education',
  'History': 'Education',
  'Anatomy & Physiology': 'Education', 
  'Nursing': 'Education',
  'Language': 'Education',
  'Chemistry': 'Education',
  'Dentistry': 'Education',
  'Art': 'Entertainment',
  'Art History': 'Entertainment',
  'Music': 'Entertainment',
  'Entertainment/Games': 'Games',
  'Sports': 'Games', 
  'General Education': 'Education',
  'Tech': 'Tools',
  'Skills and Trades': 'Education',
  'Public Speaking': 'Education',
  'Rights/Diversity/Equality': 'Education',
  'Social': 'Social',
  'Mindfulness/Meditation': 'Health & Fitness',
  'Disability': 'Education',
  'Astronomy': 'Education',
  'English': 'Education'
};

/**
 * Convert AItable CSV data to Neon database format
 */
function convertAirtableToNeon(airtableData) {
  return airtableData.map((app, index) => {
    // Extract category from tags
    const category = extractCategory(app.Tags);
    
    // Generate or clean package name
    const packageName = cleanPackageName(app['Package Name']) || generatePackageName(app.Name);
    
    // Create short description (first 500 chars)
    const shortDescription = app.Description ? 
      app.Description.substring(0, 500) + (app.Description.length > 500 ? '...' : '') : 
      '';
    
    // Determine if featured based on installation status
    const featured = app.Installed && (
      app.Installed.includes('ManageXR') || 
      app.Installed.includes('ALVR') ||
      app.Installed === 'Yes'
    );
    
    // Determine if active (not "No" installation)
    const active = app.Installed !== 'No';
    
    return {
      package_name: packageName,
      title: app.Name || 'Unnamed App',
      description: app.Description || 'No description available',
      short_description: shortDescription,
      version: "1.0.0",
      version_code: 10000,
      category: category,
      developer: extractDeveloper(packageName, app.Name),
      rating: 4.5,
      download_count: 0,
      file_size: estimateFileSize(category),
      download_url: generateDownloadUrl(packageName),
      icon_url: app.ImageURL || generatePlaceholderIcon(app.Name),
      featured: featured,
      active: active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

/**
 * Convert Neon database data to AItable CSV format
 */
function convertNeonToAirtable(neonData) {
  return neonData.map(app => {
    // Convert category back to tags
    const tags = convertCategoryToTags(app.category);
    
    // Convert featured/active status to installation status
    let installed = 'No';
    if (app.active && app.featured) {
      installed = 'Yes (ManageXR)';
    } else if (app.active) {
      installed = 'Yes';
    }
    
    return {
      'Name': app.title,
      'Image': extractImageName(app.icon_url),
      'Installed': installed,
      'Description': app.description,
      'Tags': tags,
      'Requires Update': 0,
      'ImageURL': app.icon_url,
      'Package Name': app.package_name
    };
  });
}

/**
 * Extract category from AItable tags
 */
function extractCategory(tags) {
  if (!tags) return 'Education';
  
  // Handle multiple tags separated by commas or slashes
  const tagList = tags.split(/[,\/]/).map(tag => tag.trim());
  
  // Find first matching category
  for (const tag of tagList) {
    if (CATEGORY_MAPPING[tag]) {
      return CATEGORY_MAPPING[tag];
    }
  }
  
  // Default fallback
  return 'Education';
}

/**
 * Convert category back to tags for AItable
 */
function convertCategoryToTags(category) {
  const reverseMapping = {
    'Education': 'General Education',
    'Entertainment': 'Art', 
    'Games': 'Entertainment/Games',
    'Tools': 'Tech',
    'Social': 'Social',
    'Health & Fitness': 'Mindfulness/Meditation',
    'Productivity': 'Tech'
  };
  
  return reverseMapping[category] || 'General Education';
}

/**
 * Clean and validate package name
 */
function cleanPackageName(packageName) {
  if (!packageName || packageName === 'NONE') return null;
  
  // Basic validation for Android package name format
  const packageRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)*$/;
  
  if (packageRegex.test(packageName)) {
    return packageName;
  }
  
  return null;
}

/**
 * Generate package name from app name
 */
function generatePackageName(appName) {
  if (!appName) return 'com.unknown.app';
  
  const clean = appName.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .replace(/^\.+|\.+$/g, '') // Remove leading/trailing dots
    .substring(0, 50); // Limit length
  
  return `com.app.${clean}`;
}

/**
 * Extract developer from package name or app name
 */
function extractDeveloper(packageName, appName) {
  if (packageName && packageName !== 'com.unknown.app') {
    const parts = packageName.split('.');
    if (parts.length >= 2) {
      // Capitalize first letter
      const dev = parts[1];
      return dev.charAt(0).toUpperCase() + dev.slice(1);
    }
  }
  
  // Fallback to extracting from app name
  if (appName) {
    return `${appName} Developer`;
  }
  
  return 'Unknown Developer';
}

/**
 * Estimate file size based on category
 */
function estimateFileSize(category) {
  const sizeMap = {
    'Education': 150000000,    // 150MB
    'Games': 300000000,       // 300MB  
    'Entertainment': 200000000, // 200MB
    'Tools': 50000000,        // 50MB
    'Social': 100000000,      // 100MB
    'Health & Fitness': 75000000, // 75MB
    'Productivity': 80000000   // 80MB
  };
  
  return sizeMap[category] || 100000000; // 100MB default
}

/**
 * Generate download URL
 */
function generateDownloadUrl(packageName) {
  return `https://example.com/apps/${packageName}.apk`;
}

/**
 * Generate placeholder icon URL
 */
function generatePlaceholderIcon(appName) {
  if (!appName) return 'https://via.placeholder.com/512x512/4A90E2/FFFFFF?text=App';
  
  const encoded = encodeURIComponent(appName.substring(0, 10));
  return `https://via.placeholder.com/512x512/4A90E2/FFFFFF?text=${encoded}`;
}

/**
 * Extract image name from URL or path
 */
function extractImageName(iconUrl) {
  if (!iconUrl) return 'placeholder.jpg';
  
  const parts = iconUrl.split('/');
  const filename = parts[parts.length - 1];
  
  if (filename.includes('.')) {
    return filename;
  }
  
  return 'app-icon.jpg';
}

/**
 * Parse CSV data from string
 */
async function parseCsvString(csvString) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = require('stream');
    const readable = new stream.Readable();
    readable.push(csvString);
    readable.push(null);
    
    readable
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

/**
 * Main sync function: AItable -> Neon
 */
async function syncAirtableToNeon(csvData, dbHelpers) {
  try {
    console.log('🔄 Starting AItable -> Neon sync...');
    
    // Parse CSV data
    const airtableApps = typeof csvData === 'string' ? 
      await parseCsvString(csvData) : csvData;
    
    console.log(`📊 Found ${airtableApps.length} apps in AItable`);
    
    // Convert to Neon format
    const neonApps = convertAirtableToNeon(airtableApps);
    
    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    // Process each app
    for (const app of neonApps) {
      try {
        // Check if app already exists
        const existingApps = await dbHelpers.getApps(1, 100);
        const existing = existingApps.apps.find(existing => 
          existing.package_name === app.package_name || 
          existing.title === app.title
        );
        
        if (existing) {
          // Update existing app
          await dbHelpers.updateApp(existing.id, app);
          updatedCount++;
          console.log(`✅ Updated: ${app.title}`);
        } else {
          // Add new app
          await dbHelpers.addApp(app);
          addedCount++;
          console.log(`➕ Added: ${app.title}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${app.title}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`🎉 Sync complete! Added: ${addedCount}, Updated: ${updatedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      added: addedCount,
      updated: updatedCount,
      errors: errorCount,
      total: airtableApps.length
    };
    
  } catch (error) {
    console.error('💥 Sync failed:', error);
    throw error;
  }
}

/**
 * Main sync function: Neon -> AItable  
 */
async function syncNeonToAirtable(dbHelpers) {
  try {
    console.log('🔄 Starting Neon -> AItable sync...');
    
    // Get all apps from Neon
    const result = await dbHelpers.getApps(1, 1000); // Get up to 1000 apps
    const neonApps = result.apps;
    
    console.log(`📊 Found ${neonApps.length} apps in Neon`);
    
    // Convert to AItable format
    const airtableApps = convertNeonToAirtable(neonApps);
    
    // Generate CSV
    const csvWriter = createObjectCsvWriter({
      path: '/tmp/neon-to-airtable.csv',
      header: [
        {id: 'Name', title: 'Name'},
        {id: 'Image', title: 'Image'}, 
        {id: 'Installed', title: 'Installed'},
        {id: 'Description', title: 'Description'},
        {id: 'Tags', title: 'Tags'},
        {id: 'Requires Update', title: 'Requires Update'},
        {id: 'ImageURL', title: 'ImageURL'},
        {id: 'Package Name', title: 'Package Name'}
      ]
    });
    
    await csvWriter.writeRecords(airtableApps);
    
    console.log(`🎉 Export complete! Generated CSV with ${airtableApps.length} apps`);
    
    return {
      success: true,
      exported: airtableApps.length,
      csvPath: '/tmp/neon-to-airtable.csv',
      data: airtableApps
    };
    
  } catch (error) {
    console.error('💥 Export failed:', error);
    throw error;
  }
}

/**
 * Get sync status and statistics
 */
async function getSyncStatus(dbHelpers) {
  try {
    const result = await dbHelpers.getApps(1, 1000);
    const apps = result.apps;
    
    const stats = {
      totalApps: apps.length,
      activeApps: apps.filter(app => app.active).length,
      featuredApps: apps.filter(app => app.featured).length,
      categories: [...new Set(apps.map(app => app.category))].length,
      lastUpdated: apps.reduce((latest, app) => {
        const appDate = new Date(app.updated_at);
        return appDate > latest ? appDate : latest;
      }, new Date(0))
    };
    
    return {
      success: true,
      stats,
      lastSyncCheck: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting sync status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions
module.exports = {
  syncAirtableToNeon,
  syncNeonToAirtable, 
  getSyncStatus,
  convertAirtableToNeon,
  convertNeonToAirtable,
  FIELD_MAPPING,
  CATEGORY_MAPPING
};

// CLI usage
if (require.main === module) {
  console.log('🔄 AItable ↔ Neon Sync System');
  console.log('Use this via API endpoints or import as module');
}