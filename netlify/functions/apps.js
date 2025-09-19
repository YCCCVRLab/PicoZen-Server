const { get and set } = require("@netlify/blobs");

// Helper to get app data from blobs
async function getAppData() {
  const blob = await get("app-data", { type: "json" });
  return blob || { apps: [], nextId: 1 };
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        allowedMethods: ['GET'],
        requestedMethod: event.httpMethod
      })
    };
  }

  try {
    const { apps, nextId } = await getAppData(); // Get persistent app data
    const { queryStringParameters = {} } = event;
    const { page = '1', limit = '20', category, search } = queryStringParameters;
    
    let filteredApps = apps.filter(app => app.active);
    
    // Filter by category
    if (category && category.trim() !== '') {
      filteredApps = filteredApps.filter(app => 
        app.category.toLowerCase() === category.toLowerCase()
      );
    }
    
    // Filter by search
    if (search && search.trim() !== '') {
      const searchLower = search.toLowerCase();
      filteredApps = filteredApps.filter(app =>
        app.title.toLowerCase().includes(searchLower) ||
        app.description.toLowerCase().includes(searchLower) ||
        app.developer.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    const paginatedApps = filteredApps.slice(offset, offset + limitNum);
    
    // Transform for API response
    const transformedApps = paginatedApps.map(app => ({
      id: app.id,
      packageName: app.packageName,
      title: app.title,
      description: app.description,
      shortDescription: app.shortDescription,
      version: app.version,
      versionCode: app.versionCode,
      category: app.category,
      developer: app.developer,
      rating: app.rating,
      downloadCount: app.downloadCount,
      fileSize: app.fileSize,
      downloadUrl: app.downloadUrl,
      iconUrl: app.iconUrl,
      featured: app.featured,
      screenshots: app.screenshots || [],
      createdAt: app.createdAt,
      updatedAt: app.updatedAt
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apps: transformedApps,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredApps.length,
          pages: Math.ceil(filteredApps.length / limitNum)
        },
        debug: {
          totalAppsInDatabase: apps.length,
          activeApps: apps.filter(app => app.active).length,
          requestedCategory: category,
          requestedSearch: search
        }
      })
    };
    
  } catch (error) {
    console.error('Apps function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      })
    };
  }
};