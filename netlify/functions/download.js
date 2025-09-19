// Download function - handles app downloads and redirects
const apps = [
  {
    id: 1,
    title: 'UbiSim',
    downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
    version: '1.18.0.157'
  }
];

exports.handler = async (event, context) => {
  const { httpMethod, path } = event;
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Extract app ID from path
    const pathParts = path.replace('/.netlify/functions/download', '').split('/').filter(p => p);
    
    if (pathParts.length !== 1) {
      return {
        statusCode: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid download URL' })
      };
    }
    
    const appId = parseInt(pathParts[0]);
    const app = apps.find(a => a.id === appId);
    
    if (!app) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'App not found' })
      };
    }
    
    if (!app.downloadUrl) {
      return {
        statusCode: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Download not available for this app' })
      };
    }
    
    // Log the download (in a real app, you'd save this to a database)
    console.log(`Download requested for app ${app.title} (ID: ${appId})`);
    
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