// Public apps endpoint with Supabase + GitHub + fallback

// Supabase configuration
const SUPABASE_URL = "https://elragqsejbarytfkiyxc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVscmFncXNlamJhcnl0ZmtpeXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyOTUzODQsImV4cCI6MjA3Mzg3MTM4NH0.bREsWnnaS_tfF3mQYtoO--LyPjJOBQNDeMC-bbBMloA";

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

// Helper to get apps from GitHub JSON file
async function getAppsFromGitHub() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/YCCCVRLab/PicoZen-Server/main/public/data/apps.json');
    
    if (!response.ok) {
      throw new Error(`GitHub fetch error: ${response.status}`);
    }

    const apps = await response.json();
    return Array.isArray(apps) ? apps : [];
  } catch (error) {
    console.error('GitHub fetch error:', error);
    return null;
  }
}

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

// Multi-tier data retrieval with fallbacks
async function getAppData() {
  let dataSource = 'unknown';
  
  try {
    // Try Supabase first (most up-to-date)
    console.log('Attempting to fetch from Supabase...');
    const supabaseApps = await getAppsFromSupabase();
    if (supabaseApps && supabaseApps.length > 0) {
      console.log(`Loaded ${supabaseApps.length} apps from Supabase`);
      return { apps: supabaseApps, dataSource: 'supabase' };
    }
    
    // Try GitHub JSON file as fallback
    console.log('Supabase failed, trying GitHub...');
    const githubApps = await getAppsFromGitHub();
    if (githubApps && githubApps.length > 0) {
      console.log(`Loaded ${githubApps.length} apps from GitHub`);
      return { apps: githubApps, dataSource: 'github' };
    }
    
    // Final fallback to default apps
    console.log('All external sources failed, using default apps');
    const defaultApps = getDefaultApps();
    return { apps: defaultApps, dataSource: 'default' };
    
  } catch (error) {
    console.error('All data sources failed:', error);
    const defaultApps = getDefaultApps();
    return { apps: defaultApps, dataSource: 'emergency-fallback' };
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
    // Get all apps with multi-tier fallback system
    const { apps: allApps, dataSource } = await getAppData();
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
          dataSource: dataSource
        }
      })
    };
    
  } catch (error) {
    console.error('Apps function critical error:', error);
    
    // Final emergency fallback - return default apps no matter what
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
          dataSource: 'critical-emergency-fallback',
          error: error.message
        }
      })
    };
  }
};