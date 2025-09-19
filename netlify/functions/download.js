// Download endpoint - only for apps with real APK files

function getDefaultApps() {
  return [
    {
      id: 1,
      packageName: 'com.ubisim.player',
      title: 'UbiSim',
      downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
      active: true
    }
    // Only include apps with real, working APK download URLs
  ];
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
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
          usage: 'GET /api/download/{appId}',
          availableApps: [
            { id: 1, title: 'UbiSim', hasAPK: true }
          ]
        })
      };
    }

    const apps = getDefaultApps();
    const app = apps.find(a => a.id.toString() === appId.toString() && a.active !== false);
    
    if (!app) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'App not found or no APK available',
          appId: appId,
          availableApps: apps.map(a => ({ id: a.id, title: a.title }))
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
          appTitle: app.title,
          message: 'This app does not have a real APK file available for download'
        })
      };
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
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};