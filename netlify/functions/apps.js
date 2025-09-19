// Apps endpoint with robust fallback system

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
      return blob;
    }
    
    // If no blob data, initialize with defaults and return defaults
    const defaultApps = getDefaultApps();
    await store.set("apps", defaultApps, { type: "json" });
    return defaultApps;
    
  } catch (error) {
    console.error('Netlify Blobs error, using fallback:', error);
    // Always return default apps if anything goes wrong
    return getDefaultApps();
  }
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

  // Only allow GET requests
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
    // Get all apps with robust fallback
    let allApps;
    try {
      allApps = await getAppData();
    } catch (error) {
      console.error('getAppData failed, using default apps:', error);
      allApps = getDefaultApps();
    }
    
    const { queryStringParameters = {} } = event;
    const { page = '1', limit = '20', category, search } = queryStringParameters;
    
    // Filter active apps
    let filteredApps = allApps.filter(app => app.active !== false);
    
    // Filter by category
    if (category && category.trim() !== '' && category !== 'all') {
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
    
    // Return successful response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apps: paginatedApps,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredApps.length,
          pages: Math.ceil(filteredApps.length / limitNum)
        },
        debug: {
          totalAppsInDatabase: allApps.length,
          activeApps: filteredApps.length,
          requestedCategory: category,
          requestedSearch: search,
          timestamp: new Date().toISOString(),
          dataSource: allApps.length > 1 ? 'netlify-blobs' : 'fallback-default'
        }
      })
    };
    
  } catch (error) {
    console.error('Apps function critical error:', error);
    
    // Final fallback - return default apps no matter what
    const defaultApps = getDefaultApps();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apps: defaultApps,
        pagination: {
          page: 1,
          limit: 20,
          total: defaultApps.length,
          pages: 1
        },
        debug: {
          totalAppsInDatabase: defaultApps.length,
          activeApps: defaultApps.length,
          timestamp: new Date().toISOString(),
          dataSource: 'emergency-fallback',
          error: error.message
        }
      })
    };
  }
};