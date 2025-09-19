const { getStore } = require("@netlify/blobs");

// Helper to get app data from blobs
async function getAppData() {
  try {
    const store = getStore("picozen-app-data");
    const blob = await store.get("apps", { type: "json" });
    
    const defaultApps = [
      {
        id: 1,
        packageName: 'com.ubisim.player',
        title: 'UbiSim',
        downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
        active: true
      }
    ];
    
    if (!blob) {
      return { apps: defaultApps, nextId: defaultApps.length + 1 };
    }
    return { apps: blob, nextId: blob.length + 1 };
  } catch (error) {
    console.error('Error getting app data:', error);
    return { 
      apps: [
        {
          id: 1,
          packageName: 'com.ubisim.player',
          title: 'UbiSim',
          downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
          active: true
        }
      ], 
      nextId: 2 
    };
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Method not allowed',
        allowedMethods: ['GET']
      })
    };
  }

  try {
    // Extract app ID from path
    const pathParts = event.path.split('/');
    const appId = pathParts[pathParts.length - 1];
    
    if (!appId || appId === 'download') {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'App ID required',
          usage: 'GET /api/download/{appId}'
        })
      };
    }

    const { apps } = await getAppData();
    const app = apps.find(a => a.id.toString() === appId.toString() && a.active !== false);
    
    if (!app) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'App not found',
          appId: appId
        })
      };
    }

    if (!app.downloadUrl) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Download URL not available for this app',
          appId: appId,
          appTitle: app.title
        })
      };
    }

    // Increment download count (if we want to track this)
    try {
      const store = getStore("picozen-app-data");
      const updatedApps = apps.map(a => {
        if (a.id.toString() === appId.toString()) {
          return { ...a, downloadCount: (a.downloadCount || 0) + 1 };
        }
        return a;
      });
      await store.set("apps", updatedApps, { type: "json" });
    } catch (updateError) {
      console.error('Failed to update download count:', updateError);
      // Continue with download even if count update fails
    }

    // Redirect to the actual download URL
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': app.downloadUrl,
        'Cache-Control': 'no-cache'
      },
      body: ''
    };
    
  } catch (error) {
    console.error('Download function error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};