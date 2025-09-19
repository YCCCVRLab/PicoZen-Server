// Enhanced admin endpoint with GitHub + Supabase dual storage and URL scraping

const ADMIN_PASSWORD = "vrlab2025";

// Supabase configuration
const SUPABASE_URL = "https://elragqsejbarytfkiyxc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscmFncXNlamJhcnl0ZmtpeXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTUzODQsImV4cCI6MjA3Mzg3MTM4NH0.bREsWnnaS_tfF3mQYtoO--LyPjJOBQNDeMC-bbBMloA";

// Helper to validate and extract app info from URLs
function parseAppFromURL(url) {
  try {
    const urlObj = new URL(url);
    let appInfo = {
      title: 'Unknown App',
      developer: 'Unknown Developer',
      category: 'Games',
      description: 'VR application - please update description',
      shortDescription: 'VR application',
      version: '1.0.0',
      rating: 4.0,
      downloadUrl: url,
      iconUrl: null,
      sourceUrls: {}
    };

    // Meta Quest Store / Meta.com
    if (urlObj.hostname.includes('meta.com') || urlObj.hostname.includes('oculus.com')) {
      appInfo.developer = 'Meta Quest Developer';
      appInfo.sourceUrls.meta = url;
      
      // Try to extract app ID from URL
      const pathMatch = url.match(/\/experiences\/[^\/]+\/(\d+)/);
      if (pathMatch) {
        const appId = pathMatch[1];
        appInfo.title = `Meta Quest App ${appId}`;
        appInfo.packageName = `com.meta.app.${appId}`;
      }
      
      // Extract potential app name from URL path
      const pathParts = urlObj.pathname.split('/');
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart && lastPart.length > 3 && !lastPart.match(/^\d+$/)) {
        appInfo.title = lastPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      return appInfo;
    }

    // SideQuest
    if (urlObj.hostname.includes('sidequestvr.com')) {
      appInfo.developer = 'SideQuest Developer';
      appInfo.sourceUrls.sidequest = url;
      
      const pathMatch = url.match(/\/app\/(\d+)/);
      if (pathMatch) {
        const appId = pathMatch[1];
        appInfo.title = `SideQuest App ${appId}`;
        appInfo.packageName = `com.sidequest.app.${appId}`;
      }
      
      return appInfo;
    }

    // Steam VR
    if (urlObj.hostname.includes('steampowered.com')) {
      appInfo.developer = 'Steam Developer';
      appInfo.sourceUrls.steam = url;
      
      const pathMatch = url.match(/\/app\/(\d+)/);
      if (pathMatch) {
        const appId = pathMatch[1];
        appInfo.title = `Steam VR App ${appId}`;
        appInfo.packageName = `com.steam.app.${appId}`;
      }
      
      return appInfo;
    }

    // Direct APK or other URLs
    appInfo.sourceUrls.direct = url;
    appInfo.title = 'Direct Download App';
    appInfo.developer = 'Independent Developer';
    
    return appInfo;

  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

// Helper to get apps from Supabase
async function getAppsFromSupabase() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/apps?select=*,screenshots(*),source_urls(*)&active=eq.true&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const apps = await response.json();
    
    // Transform to match expected format
    return apps.map(app => ({
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
      downloadUrl: app.download_url,
      iconUrl: app.icon_url,
      featured: app.featured,
      active: app.active,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      screenshots: app.screenshots || [],
      sourceUrls: app.source_urls.reduce((acc, url) => {
        acc[url.store_type] = url.url;
        return acc;
      }, {})
    }));
  } catch (error) {
    console.error('Supabase error:', error);
    return null;
  }
}

// Helper to save app to Supabase
async function saveAppToSupabase(appData, isUpdate = false) {
  try {
    const supabaseApp = {
      package_name: appData.packageName,
      title: appData.title,
      description: appData.description,
      short_description: appData.shortDescription,
      version: appData.version,
      version_code: appData.versionCode,
      category: appData.category,
      developer: appData.developer,
      rating: appData.rating,
      download_count: appData.downloadCount || 0,
      file_size: appData.fileSize,
      download_url: appData.downloadUrl,
      icon_url: appData.iconUrl,
      featured: appData.featured,
      active: appData.active,
      updated_at: new Date().toISOString()
    };

    let response;
    if (isUpdate) {
      response = await fetch(`${SUPABASE_URL}/rest/v1/apps?id=eq.${appData.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(supabaseApp)
      });
    } else {
      response = await fetch(`${SUPABASE_URL}/rest/v1/apps`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(supabaseApp)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase save error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return null;
  }
}

// Helper to save source URLs to Supabase
async function saveSourceUrlsToSupabase(appId, sourceUrls) {
  try {
    // First, delete existing source URLs for this app
    await fetch(`${SUPABASE_URL}/rest/v1/source_urls?app_id=eq.${appId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    // Then insert new source URLs
    const urlsToInsert = Object.entries(sourceUrls || {})
      .filter(([key, url]) => url)
      .map(([storeType, url]) => ({
        app_id: appId,
        store_type: storeType,
        url: url
      }));

    if (urlsToInsert.length > 0) {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/source_urls`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(urlsToInsert)
      });

      if (!response.ok) {
        console.error('Failed to save source URLs:', response.status);
      }
    }
  } catch (error) {
    console.error('Error saving source URLs:', error);
  }
}

// Helper to delete app from Supabase
async function deleteAppFromSupabase(appId) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/apps?id=eq.${appId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    return response.ok;
  } catch (error) {
    console.error('Error deleting from Supabase:', error);
    return false;
  }
}

// GitHub storage helpers
async function syncToGitHub(apps) {
  try {
    if (!process.env.GITHUB_TOKEN) {
      console.log('GitHub token not configured, skipping GitHub sync');
      return false;
    }

    const { readAppsFromGitHub, writeAppsToGitHub } = require('./github-storage');
    const githubData = await readAppsFromGitHub();
    
    if (githubData) {
      const result = await writeAppsToGitHub(apps, githubData.sha, 'Admin: Update apps via PicoZen Admin Panel');
      return result.success;
    }
    
    return false;
  } catch (error) {
    console.error('GitHub sync error:', error);
    return false;
  }
}

// Default fallback apps
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
        direct: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D'
      },
      screenshots: []
    }
  ];
}

// Helper to verify admin password
function verifyAdmin(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '');
  return token === ADMIN_PASSWORD;
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
    // GET - List all apps (try Supabase first, fallback to defaults)
    if (event.httpMethod === 'GET') {
      let apps = await getAppsFromSupabase();
      
      if (!apps || apps.length === 0) {
        apps = getDefaultApps();
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          apps: apps,
          total: apps.length,
          message: 'Apps loaded successfully',
          dataSource: apps.length > 1 ? 'supabase' : 'fallback'
        })
      };
    }

    // POST - Add new app
    if (event.httpMethod === 'POST') {
      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }

      const { action, appData, urls } = requestBody;

      // Handle URL scraping
      if (action === 'scrape-and-add') {
        if (!urls || urls.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              success: false, 
              error: 'No URLs provided for scraping' 
            })
          };
        }

        const newApps = [];
        const errors = [];

        for (const url of urls) {
          const appInfo = parseAppFromURL(url);
          
          if (!appInfo) {
            errors.push(`Failed to parse URL: ${url}`);
            continue;
          }

          const newApp = {
            packageName: appInfo.packageName || `com.${appInfo.developer.toLowerCase().replace(/\s+/g, '')}.${appInfo.title.toLowerCase().replace(/\s+/g, '')}`,
            title: appInfo.title,
            description: appInfo.description,
            shortDescription: appInfo.shortDescription,
            version: appInfo.version,
            versionCode: 1,
            category: appInfo.category,
            developer: appInfo.developer,
            rating: appInfo.rating,
            downloadCount: 0,
            fileSize: 100000000, // Default size
            downloadUrl: appInfo.downloadUrl,
            iconUrl: appInfo.iconUrl || `https://via.placeholder.com/128x128/4267B2/FFFFFF?text=${appInfo.title.charAt(0)}`,
            featured: false,
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sourceUrls: appInfo.sourceUrls,
            screenshots: []
          };

          // Save to Supabase
          const savedApp = await saveAppToSupabase(newApp);
          
          if (savedApp) {
            newApp.id = savedApp.id;
            
            // Save source URLs
            await saveSourceUrlsToSupabase(savedApp.id, appInfo.sourceUrls);
            
            newApps.push(newApp);
          } else {
            errors.push(`Failed to save app: ${appInfo.title}`);
          }
        }

        if (newApps.length > 0) {
          // Sync to GitHub
          const allApps = await getAppsFromSupabase();
          await syncToGitHub(allApps);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: newApps.length > 0,
            apps: newApps,
            message: `Successfully added ${newApps.length} apps from URLs`,
            errors: errors.length > 0 ? errors : undefined
          })
        };
      }

      // Handle manual add
      if (action === 'add-manual') {
        const newApp = {
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

        // Save to Supabase
        const savedApp = await saveAppToSupabase(newApp);
        
        if (savedApp) {
          newApp.id = savedApp.id;
          
          // Save source URLs
          await saveSourceUrlsToSupabase(savedApp.id, newApp.sourceUrls);
          
          // Sync to GitHub
          const allApps = await getAppsFromSupabase();
          await syncToGitHub(allApps);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              app: newApp,
              message: `App "${newApp.title}" added successfully and saved to database`
            })
          };
        } else {
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Failed to save app to database'
            })
          };
        }
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid action' })
      };
    }

    // PUT - Update existing app
    if (event.httpMethod === 'PUT') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!verifyAdmin(authHeader)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid admin password' })
        };
      }

      const appId = parseInt(event.queryStringParameters?.id);
      if (!appId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'App ID is required' })
        };
      }

      let requestBody;
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid JSON' })
        };
      }

      // Update in Supabase
      const updatedApp = {
        id: appId,
        packageName: requestBody.packageName,
        title: requestBody.title,
        description: requestBody.description,
        shortDescription: requestBody.shortDescription,
        version: requestBody.version,
        versionCode: requestBody.versionCode,
        category: requestBody.category,
        developer: requestBody.developer,
        rating: requestBody.rating,
        downloadCount: requestBody.downloadCount,
        fileSize: requestBody.fileSize,
        downloadUrl: requestBody.downloadUrl,
        iconUrl: requestBody.iconUrl,
        featured: requestBody.featured,
        active: requestBody.active,
        updatedAt: new Date().toISOString()
      };

      const savedApp = await saveAppToSupabase(updatedApp, true);
      
      if (savedApp) {
        // Update source URLs
        await saveSourceUrlsToSupabase(appId, requestBody.sourceUrls);
        
        // Sync to GitHub
        const allApps = await getAppsFromSupabase();
        await syncToGitHub(allApps);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            app: updatedApp,
            message: `App "${updatedApp.title}" updated successfully in database`
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to update app in database'
          })
        };
      }
    }

    // DELETE - Delete app
    if (event.httpMethod === 'DELETE') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      if (!verifyAdmin(authHeader)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'Invalid admin password' })
        };
      }

      const appId = parseInt(event.queryStringParameters?.id);
      if (!appId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'App ID is required' })
        };
      }

      const deleted = await deleteAppFromSupabase(appId);
      
      if (deleted) {
        // Sync to GitHub
        const allApps = await getAppsFromSupabase();
        await syncToGitHub(allApps);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'App deleted successfully from database'
          })
        };
      } else {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Failed to delete app from database'
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Add-app function error:', error);
    
    // Emergency fallback
    if (event.httpMethod === 'GET') {
      const defaultApps = getDefaultApps();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          apps: defaultApps,
          total: defaultApps.length,
          message: 'Apps loaded (emergency fallback)',
          dataSource: 'emergency-fallback'
        })
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};