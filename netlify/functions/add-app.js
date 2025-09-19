// Admin endpoint with robust fallback system

// Admin password - you can change this
const ADMIN_PASSWORD = "vrlab2025";

// Default apps data (always available)
function getDefaultApps() {
  return [
    {
      id: 1,
      packageName: 'com.ubisim.player',
      title: 'UbiSim',
      description: 'UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.\n\nKey Features:\n• Immersive VR nursing simulations\n• Realistic patient interactions\n• Medical equipment training\n• Clinical procedure practice\n• Safe learning environment\n• Professional development tools\n• Comprehensive skill assessment\n\nPerfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.',
      shortDescription: 'Immersive VR nursing simulation platform for clinical training and skill development',
      version: '1.18.0.157',
      versionCode: 118000157,
      category: 'Education',
      developer: 'UbiSim',
      rating: 4.8,
      downloadCount: 1250,
      fileSize: 157286400,
      downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
      iconUrl: 'https://scontent-lga3-3.oculuscdn.com/v/t64.5771-25/57570314_1220899138305712_3549230735456268391_n.jpg?stp=dst-jpg_q92_s720x720_tt6&_nc_cat=108&ccb=1-7&_nc_sid=6e7a0a&_nc_ohc=abiM3cUS1t0Q7kNvwEG6f1M&_nc_oc=Adlp9UfoNVCqrK-SF2vUQyBzNMkhhmJ3jvqEt7cfDM_qYnrQBVzTmcC-E25FLjrIr8Y&_nc_zt=3&_nc_ht=scontent-lga3-3.oculuscdn.com&oh=00_AfbbeH7p7KL9MnwLkOJPJMiKRTOgGj_LNCz46TKiUK_knA&oe=68D3347B',
      featured: true,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceUrls: {
        meta: null,
        sidequest: null,
        steam: null,
        direct: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D'
      },
      screenshots: [
        {
          id: 1,
          imageUrl: 'https://scontent-lga3-1.oculuscdn.com/v/t64.7195-25/38984472_169844144659621_3902083327436685927_n.mp4?_nc_cat=103&ccb=1-7&_nc_sid=b20b63&_nc_ohc=UdTZVSh8_P4Q7kNvwHMKhiH&_nc_oc=AdlRAoAmsizYNq9JdGRXgsNIUvbASw06CefWGFpJ_Md_5lN46DHggxXasu8cDDC95fM&_nc_zt=28&_nc_ht=scontent-lga3-1.oculuscdn.com&_nc_gid=vM72Tx9O81wgigJ8zr_kMw&oh=00_AfbWIvC-TEvNv-F_qmail5Z_qk8odQ1zwY_rymHdHKupPg&oe=68D33CB7',
          caption: 'UbiSim VR Training Demo',
          displayOrder: 0
        }
      ]
    }
  ];
}

// Try to get apps from Netlify Blobs, fallback to default
async function getAppData() {
  try {
    // Try to use Netlify Blobs
    const { getStore } = require("@netlify/blobs");
    const store = getStore("picozen-app-data");
    const blob = await store.get("apps", { type: "json" });
    
    if (blob && Array.isArray(blob)) {
      return { apps: blob, nextId: Math.max(...blob.map(app => app.id), 0) + 1 };
    }
    
    // If no blob data, initialize with defaults
    const defaultApps = getDefaultApps();
    await store.set("apps", defaultApps, { type: "json" });
    return { apps: defaultApps, nextId: defaultApps.length + 1 };
    
  } catch (error) {
    console.error('Netlify Blobs error, using fallback:', error);
    // Always return default apps if anything goes wrong
    const defaultApps = getDefaultApps();
    return { apps: defaultApps, nextId: defaultApps.length + 1 };
  }
}

// Try to save app data to Netlify Blobs
async function saveAppData(apps) {
  try {
    const { getStore } = require("@netlify/blobs");
    const store = getStore("picozen-app-data");
    await store.set("apps", apps, { type: "json" });
    return true;
  } catch (error) {
    console.error('Error saving app data:', error);
    return false;
  }
}

// Helper to verify admin password
function verifyAdmin(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_PASSWORD;
}

// Helper to generate next ID
function getNextId(apps) {
  return Math.max(...apps.map(app => app.id), 0) + 1;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Get apps with robust fallback
    let appData;
    try {
      appData = await getAppData();
    } catch (error) {
      console.error('getAppData failed, using defaults:', error);
      const defaultApps = getDefaultApps();
      appData = { apps: defaultApps, nextId: defaultApps.length + 1 };
    }
    
    const { apps } = appData;

    // GET - List all apps (for admin panel)
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          apps: apps,
          total: apps.length,
          message: 'Apps loaded successfully'
        })
      };
    }

    // POST - Add new app or scrape from URLs
    if (event.httpMethod === 'POST') {
      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body'
          })
        };
      }

      const { action, appData, urls } = requestBody;

      if (action === 'scrape-and-add') {
        // Basic URL scraping simulation
        const newApps = [];
        
        for (const url of urls || []) {
          let appTitle = 'Unknown App';
          let category = 'Games';
          let developer = 'Unknown Developer';
          
          // Simple URL parsing to extract app info
          if (url.includes('oculus.com') || url.includes('meta.com')) {
            developer = 'Meta';
            category = 'Games';
          } else if (url.includes('sidequestvr.com')) {
            developer = 'SideQuest Developer';
            category = 'Games';
          } else if (url.includes('steampowered.com')) {
            developer = 'Steam Developer';
            category = 'Games';
          }
          
          // Extract potential app name from URL
          const urlParts = url.split('/');
          const lastPart = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
          if (lastPart && lastPart !== '') {
            appTitle = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          }
          
          const newApp = {
            id: getNextId([...apps, ...newApps]),
            packageName: `com.${developer.toLowerCase().replace(/\s+/g, '')}.${appTitle.toLowerCase().replace(/\s+/g, '')}`,
            title: appTitle,
            description: `${appTitle} - A VR application from ${developer}. Please update this description with accurate information.`,
            shortDescription: `VR app from ${developer}`,
            version: '1.0.0',
            versionCode: 1,
            category: category,
            developer: developer,
            rating: 4.0,
            downloadCount: 0,
            fileSize: 100000000,
            downloadUrl: url, // Using the source URL as download URL for now
            iconUrl: 'https://via.placeholder.com/128x128/4267B2/FFFFFF?text=' + appTitle.charAt(0),
            featured: false,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceUrls: {
              meta: url.includes('oculus.com') || url.includes('meta.com') ? url : null,
              sidequest: url.includes('sidequestvr.com') ? url : null,
              steam: url.includes('steampowered.com') ? url : null,
              direct: null
            },
            screenshots: []
          };
          
          newApps.push(newApp);
        }
        
        const updatedApps = [...apps, ...newApps];
        const saved = await saveAppData(updatedApps);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: saved,
            apps: newApps,
            message: saved 
              ? `Successfully added ${newApps.length} apps from URLs`
              : `Added ${newApps.length} apps (storage may be temporary)`
          })
        };
      }

      if (action === 'add-manual') {
        const newApp = {
          id: getNextId(apps),
          packageName: appData.packageName || `com.${(appData.developer || 'unknown').toLowerCase().replace(/\s+/g, '')}.${(appData.title || 'app').toLowerCase().replace(/\s+/g, '')}`,
          title: appData.title,
          description: appData.description || '',
          shortDescription: appData.shortDescription || '',
          version: appData.version || '1.0.0',
          versionCode: appData.versionCode || 1,
          category: appData.category || 'Games',
          developer: appData.developer,
          rating: appData.rating || 0,
          downloadCount: 0,
          fileSize: appData.fileSize || 100000000,
          downloadUrl: appData.downloadUrl || '',
          iconUrl: appData.iconUrl || 'https://via.placeholder.com/128x128/4267B2/FFFFFF?text=' + (appData.title || 'App').charAt(0),
          featured: appData.featured || false,
          active: appData.active !== false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sourceUrls: appData.sourceUrls || {},
          screenshots: appData.screenshots || []
        };
        
        const updatedApps = [...apps, newApp];
        const saved = await saveAppData(updatedApps);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            app: newApp,
            message: saved 
              ? `App "${newApp.title}" added successfully`
              : `App "${newApp.title}" added (storage may be temporary)`
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid action specified'
        })
      };
    }

    // PUT - Update existing app
    if (event.httpMethod === 'PUT') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!verifyAdmin(authHeader)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid admin password'
          })
        };
      }

      const appId = parseInt(event.queryStringParameters?.id);
      if (!appId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'App ID is required'
          })
        };
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body'
          })
        };
      }

      const appIndex = apps.findIndex(app => app.id === appId);
      if (appIndex === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'App not found'
          })
        };
      }

      // Update the app with new data
      const updatedApp = {
        ...apps[appIndex],
        ...requestBody,
        id: appId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };

      apps[appIndex] = updatedApp;
      const saved = await saveAppData(apps);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          app: updatedApp,
          message: saved 
            ? `App "${updatedApp.title}" updated successfully`
            : `App "${updatedApp.title}" updated (storage may be temporary)`
        })
      };
    }

    // DELETE - Delete app
    if (event.httpMethod === 'DELETE') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!verifyAdmin(authHeader)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid admin password'
          })
        };
      }

      const appId = parseInt(event.queryStringParameters?.id);
      if (!appId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'App ID is required'
          })
        };
      }

      const appIndex = apps.findIndex(app => app.id === appId);
      if (appIndex === -1) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'App not found'
          })
        };
      }

      const deletedApp = apps[appIndex];
      apps.splice(appIndex, 1);
      const saved = await saveAppData(apps);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: saved 
            ? `App "${deletedApp.title}" deleted successfully`
            : `App "${deletedApp.title}" deleted (change may be temporary)`
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
      })
    };

  } catch (error) {
    console.error('Add-app function critical error:', error);
    
    // Emergency fallback for GET requests
    if (event.httpMethod === 'GET') {
      const defaultApps = getDefaultApps();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          apps: defaultApps,
          total: defaultApps.length,
          message: 'Apps loaded successfully (emergency fallback)'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};