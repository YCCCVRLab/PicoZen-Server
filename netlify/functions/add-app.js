// Function to add apps from scraped store data
const { Octokit } = require('@octokit/rest');

// In-memory database (in production, you'd use a real database)
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
    sourceUrls: {
      meta: null,
      sidequest: null,
      steam: null,
      direct: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk'
    },
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

let nextId = 2;

// Helper function to generate package name from title
function generatePackageName(title, developer) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDev = developer.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `com.${cleanDev}.${cleanTitle}`;
}

// Helper function to categorize apps
function categorizeApp(title, description, category) {
  if (category) return category;
  
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('game') || text.includes('adventure') || text.includes('action') || text.includes('puzzle')) {
    return 'Games';
  } else if (text.includes('education') || text.includes('learning') || text.includes('training') || text.includes('simulation')) {
    return 'Education';
  } else if (text.includes('fitness') || text.includes('exercise') || text.includes('health') || text.includes('workout')) {
    return 'Health & Fitness';
  } else if (text.includes('social') || text.includes('chat') || text.includes('meeting') || text.includes('communication')) {
    return 'Social';
  } else if (text.includes('productivity') || text.includes('work') || text.includes('office') || text.includes('utility')) {
    return 'Productivity';
  } else if (text.includes('media') || text.includes('video') || text.includes('music') || text.includes('entertainment')) {
    return 'Entertainment';
  } else {
    return 'Tools';
  }
}

exports.handler = async (event, context) => {
  const { httpMethod, body } = event;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (httpMethod === 'GET') {
    // Return current apps for admin interface
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        apps: apps.map(app => ({
          id: app.id,
          title: app.title,
          developer: app.developer,
          category: app.category,
          version: app.version,
          downloadCount: app.downloadCount,
          featured: app.featured,
          sourceUrls: app.sourceUrls,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt
        }))
      })
    };
  }

  if (httpMethod === 'POST') {
    try {
      const requestData = JSON.parse(body);
      
      if (requestData.action === 'scrape-and-add') {
        // Scrape store URLs and add apps
        const { urls } = requestData;
        
        if (!urls || !Array.isArray(urls)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'URLs array is required' })
          };
        }

        // Call the scraping function
        const scrapeResponse = await fetch(`${event.headers.host}/.netlify/functions/scrape-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls })
        });

        const scrapeData = await scrapeResponse.json();
        
        if (!scrapeData.success) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Scraping failed', details: scrapeData })
          };
        }

        const addedApps = [];
        
        for (const scrapedApp of scrapeData.results) {
          if (scrapedApp.error) {
            console.log('Skipping failed scrape:', scrapedApp);
            continue;
          }

          // Create new app from scraped data
          const newApp = {
            id: nextId++,
            packageName: generatePackageName(scrapedApp.title || 'Unknown App', scrapedApp.developer || 'Unknown'),
            title: scrapedApp.title || 'Unknown App',
            description: scrapedApp.description || 'No description available',
            shortDescription: scrapedApp.description ? 
              scrapedApp.description.substring(0, 200) + (scrapedApp.description.length > 200 ? '...' : '') : 
              'No description available',
            version: scrapedApp.version || '1.0.0',
            versionCode: 1,
            category: categorizeApp(scrapedApp.title || '', scrapedApp.description || '', scrapedApp.category),
            developer: scrapedApp.developer || 'Unknown Developer',
            rating: scrapedApp.rating || 0,
            downloadCount: Math.floor(Math.random() * 1000) + 100, // Random for demo
            fileSize: scrapedApp.fileSize || null,
            downloadUrl: scrapedApp.downloadUrl || null,
            iconUrl: scrapedApp.iconUrl || null,
            featured: false,
            active: true,
            sourceUrls: {
              meta: scrapedApp.sourceStore === 'Meta Quest Store' ? scrapedApp.sourceUrl : null,
              sidequest: scrapedApp.sourceStore === 'SideQuest' ? scrapedApp.sourceUrl : null,
              steam: scrapedApp.sourceStore === 'Steam VR' ? scrapedApp.sourceUrl : null,
              direct: scrapedApp.downloadUrl
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            screenshots: scrapedApp.screenshots || []
          };

          apps.push(newApp);
          addedApps.push(newApp);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Added ${addedApps.length} apps`,
            apps: addedApps.map(app => ({
              id: app.id,
              title: app.title,
              developer: app.developer,
              category: app.category,
              sourceStore: Object.keys(app.sourceUrls).find(key => app.sourceUrls[key])
            }))
          })
        };

      } else if (requestData.action === 'add-manual') {
        // Manually add app with provided data
        const { appData } = requestData;
        
        const newApp = {
          id: nextId++,
          packageName: appData.packageName || generatePackageName(appData.title, appData.developer),
          title: appData.title,
          description: appData.description,
          shortDescription: appData.shortDescription || appData.description?.substring(0, 200),
          version: appData.version || '1.0.0',
          versionCode: appData.versionCode || 1,
          category: appData.category || 'Games',
          developer: appData.developer,
          rating: appData.rating || 0,
          downloadCount: appData.downloadCount || 0,
          fileSize: appData.fileSize || null,
          downloadUrl: appData.downloadUrl,
          iconUrl: appData.iconUrl,
          featured: appData.featured || false,
          active: true,
          sourceUrls: appData.sourceUrls || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          screenshots: appData.screenshots || []
        };

        apps.push(newApp);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'App added successfully',
            app: newApp
          })
        };
      }

    } catch (error) {
      console.error('Add app error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Internal server error',
          message: error.message
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};