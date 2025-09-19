const { Handler } = require('@netlify/functions');

// In-memory database for now (in production, you'd use a real database)
let apps = [
  {
    id: 1,
    packageName: 'com.ubisim.player',
    title: 'UbiSim',
    description: `UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.

Key Features:
• Immersive VR nursing simulations
• Realistic patient interactions
• Medical equipment training
• Clinical procedure practice
• Safe learning environment
• Professional development tools
• Comprehensive skill assessment

Perfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.`,
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

const categories = [
  { id: 1, name: 'Games', description: 'VR Games and Entertainment', appCount: 0 },
  { id: 2, name: 'Education', description: 'Learning and Training Applications', appCount: 1 },
  { id: 3, name: 'Productivity', description: 'Work and Utility Applications', appCount: 0 },
  { id: 4, name: 'Social', description: 'Communication and Social VR', appCount: 0 },
  { id: 5, name: 'Health & Fitness', description: 'Exercise and Wellness Apps', appCount: 0 },
  { id: 6, name: 'Entertainment', description: 'Media and Video Applications', appCount: 0 },
  { id: 7, name: 'Tools', description: 'System Utilities and Tools', appCount: 0 }
];

// Export the apps array so other functions can access it
global.picozenApps = apps;

exports.handler = async (event, context) => {
  const { httpMethod, path, queryStringParameters } = event;
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse the path to determine the endpoint
    const pathParts = path.replace('/.netlify/functions/apps', '').split('/').filter(p => p);
    
    if (httpMethod === 'GET') {
      // GET /apps - List all apps
      if (pathParts.length === 0) {
        const { page = 1, limit = 20, category, search } = queryStringParameters || {};
        
        let filteredApps = apps.filter(app => app.active);
        
        // Filter by category
        if (category) {
          filteredApps = filteredApps.filter(app => 
            app.category.toLowerCase() === category.toLowerCase()
          );
        }
        
        // Filter by search
        if (search) {
          const searchLower = search.toLowerCase();
          filteredApps = filteredApps.filter(app =>
            app.title.toLowerCase().includes(searchLower) ||
            app.description.toLowerCase().includes(searchLower) ||
            app.developer.toLowerCase().includes(searchLower)
          );
        }
        
        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
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
          downloadUrl: app.downloadUrl, // Direct URL for now
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
            }
          })
        };
      }
      
      // GET /apps/:id - Get single app
      if (pathParts.length === 1) {
        const appId = parseInt(pathParts[0]);
        const app = apps.find(a => a.id === appId && a.active);
        
        if (!app) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'App not found' })
          };
        }
        
        const transformedApp = {
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
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            app: transformedApp
          })
        };
      }
    }
    
    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};