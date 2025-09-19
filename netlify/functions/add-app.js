const { get, set } = require("@netlify/blobs");
const fetch = require('node-fetch');

// Helper to get app data from blobs
async function getAppData() {
  const blob = await get("picozen-app-data", { type: "json" });
  const defaultApps = [
    {
      id: 1,
      packageName: 'com.ubisim.player',
      title: 'UbiSim',
      description: `UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.\n\nKey Features:\n• Immersive VR nursing simulations\n• Realistic patient interactions\n• Medical equipment training\n• Clinical procedure practice\n• Safe learning environment\n• Professional development tools\n• Comprehensive skill assessment\n\nPerfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.`,
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
        direct: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D'
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

  if (!blob) {
    return { apps: defaultApps, nextId: defaultApps.length + 1 };
  }
  return blob;
}

// Helper to set app data to blobs
async function setAppData(data) {
  await set("picozen-app-data", data, { type: "json" });
}

// Store-specific scrapers
const scrapers = {
  meta: {
    name: 'Meta Quest Store',
    urlPattern: /^https:\/\/(www\.)?oculus\.com\/experiences\/(quest|rift)\/\d+/,
    scrape: async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        const html = await response.text();
        
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
        const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        const priceMatch = html.match(/price['"]\s*:\s*['"]([^'"]+)['"]/i);
        
        return {
          title: titleMatch ? titleMatch[1].split(' | ')[0] : null,
          description: descMatch ? descMatch[1] : null,
          iconUrl: imageMatch ? imageMatch[1] : null,
          price: priceMatch ? priceMatch[1] : 'Free',
          developer: extractDeveloper(html),
          category: extractCategory(html),
          rating: extractRating(html),
          screenshots: extractScreenshots(html)
        };
      } catch (error) {
        console.error('Meta scraping error:', error);
        return null;
      }
    }
  },
  
  sidequest: {
    name: 'SideQuest',
    urlPattern: /^https:\/\/(www\.)?sidequestvr\.com\/app\/\d+/,
    scrape: async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const html = await response.text();
        
        return {
          title: extractSideQuestTitle(html),
          description: extractSideQuestDescription(html),
          iconUrl: extractSideQuestIcon(html),
          developer: extractSideQuestDeveloper(html),
          category: 'Games', // SideQuest is mostly games
          downloadUrl: extractSideQuestDownload(html),
          version: extractSideQuestVersion(html),
          fileSize: extractSideQuestSize(html)
        };
      } catch (error) {
        console.error('SideQuest scraping error:', error);
        return null;
      }
    }
  },
  
  steam: {
    name: 'Steam VR',
    urlPattern: /^https:\/\/(store\.)?steampowered\.com\/app\/\d+/,
    scrape: async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const html = await response.text();
        
        return {
          title: extractSteamTitle(html),
          description: extractSteamDescription(html),
          iconUrl: extractSteamIcon(html),
          developer: extractSteamDeveloper(html),
          category: extractSteamCategory(html),
          price: extractSteamPrice(html),
          rating: extractSteamRating(html),
          screenshots: extractSteamScreenshots(html)
        };
      } catch (error) {
        console.error('Steam scraping error:', error);
        return null;
      }
    }
  }
};

// Helper functions for data extraction (same as before)
function extractDeveloper(html) {
  const devMatch = html.match(/developer['"]\s*:\s*['"]([^'"]+)['"]/i) ||
                   html.match(/by\s+([^<]+)</i) ||
                   html.match(/Developer:\s*([^<\n]+)/i);
  return devMatch ? devMatch[1].trim() : 'Unknown Developer';
}

function extractCategory(html) {
  const catMatch = html.match(/category['"]\s*:\s*['"]([^'"]+)['"]/i) ||
                   html.match(/Genre:\s*([^<\n]+)/i);
  return catMatch ? catMatch[1].trim() : 'Games';
}

function extractRating(html) {
  const ratingMatch = html.match(/rating['"]\s*:\s*['"]?([0-9.]+)['"]?/i) ||
                      html.match(/(\d+\.?\d*)\s*\/\s*5/);
  return ratingMatch ? parseFloat(ratingMatch[1]) : 0;
}

function extractScreenshots(html) {
  const screenshots = [];
  const imgMatches = html.match(/<img[^>]+src="([^"]*screenshot[^"]*)"[^>]*>/gi) || [];
  imgMatches.forEach((match, index) => {
    const srcMatch = match.match(/src="([^"]+)"/);
    if (srcMatch && index < 5) { // Limit to 5 screenshots
      screenshots.push({
        imageUrl: srcMatch[1],
        caption: `Screenshot ${index + 1}`,
        displayOrder: index
      });
    }
  });
  return screenshots;
}

function extractSideQuestTitle(html) {
  const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/) ||
                html.match(/<title>([^|<]+)/);
  return match ? match[1].trim() : null;
}

function extractSideQuestDescription(html) {
  const match = html.match(/<meta name="description" content="([^"]+)"/) ||
                html.match(/<p class="description[^"]*">([^<]+)<\/p>/);
  return match ? match[1].trim() : null;
}

function extractSideQuestIcon(html) {
  const match = html.match(/<meta property="og:image" content="([^"]+)"/) ||
                html.match(/<img[^>]+class="[^"]*icon[^"]*"[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

function extractSideQuestDeveloper(html) {
  const match = html.match(/Developer:\s*([^<\n]+)/) ||
                html.match(/by\s+([^<\n]+)/);
  return match ? match[1].trim() : 'Unknown Developer';
}

function extractSideQuestDownload(html) {
  const match = html.match(/href="([^"]*\.apk[^"]*)"/i) ||
                html.match(/download[^>]*href="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractSideQuestVersion(html) {
  const match = html.match(/Version:\s*([^<\n]+)/) ||
                html.match(/v(\d+\.\d+\.\d+)/);
  return match ? match[1].trim() : '1.0.0';
}

function extractSideQuestSize(html) {
  const match = html.match(/Size:\s*([^<\n]+)/) ||
                html.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
  if (match) {
    const size = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase() || 'MB';
    return unit === 'GB' ? size * 1024 * 1024 * 1024 : size * 1024 * 1024;
  }
  return null;
}

function extractSteamTitle(html) {
  const match = html.match(/<div class="apphub_AppName">([^<]+)<\/div>/) ||
                html.match(/<title>([^<]+) on Steam<\/title>/);
  return match ? match[1].trim() : null;
}

function extractSteamDescription(html) {
  const match = html.match(/<div class="game_description_snippet">([^<]+)<\/div>/) ||
                html.match(/<meta name="description" content="([^"]+)"/);
  return match ? match[1].trim() : null;
}

function extractSteamIcon(html) {
  const match = html.match(/<img class="game_header_image_full"[^>]+src="([^"]+)"/) ||
                html.match(/<meta property="og:image" content="([^"]+)"/);
  return match ? match[1] : null;
}

function extractSteamDeveloper(html) {
  const match = html.match(/<div class="summary column"[^>]*>[\s\S]*?Developer:\s*<\/div>[\s\S]*?<div[^>]*>([^<]+)<\/div>/) ||
                html.match(/Developer:\s*([^<\n]+)/);
  return match ? match[1].trim() : 'Unknown Developer';
}

function extractSteamCategory(html) {
  const match = html.match(/Genre:\s*([^<\n]+)/) ||
                html.match(/<a[^>]*>([^<]*VR[^<]*)<\/a>/i);
  return match ? match[1].trim() : 'Games';
}

function extractSteamPrice(html) {
  const match = html.match(/<div class="game_purchase_price[^"]*">([^<]+)<\/div>/) ||
                html.match(/price['"]\s*:\s*['"]([^'"]+)['"]/);
  return match ? match[1].trim() : 'Free';
}

function extractSteamRating(html) {
  const match = html.match(/(\d+)% of the \d+ user reviews/) ||
                html.match(/rating['"]\s*:\s*['"]?([0-9.]+)['"]?/);
  return match ? parseFloat(match[1]) / 20 : 0; // Convert percentage to 5-star rating
}

function extractSteamScreenshots(html) {
  const screenshots = [];
  const matches = html.match(/<a[^>]+class="highlight_screenshot_link"[^>]+href="([^"]+)"/g) || [];
  matches.forEach((match, index) => {
    const urlMatch = match.match(/href="([^"]+)"/);
    if (urlMatch && index < 5) { // Limit to 5 screenshots
      screenshots.push({
        imageUrl: urlMatch[1],
        caption: `Screenshot ${index + 1}`,
        displayOrder: index
      });
    }
  });
  return screenshots;
}

exports.handler = async (event, context) => {
  const { httpMethod, body, queryStringParameters } = event;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Basic authentication for POST, PUT, DELETE
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  if (httpMethod !== 'GET') {
    const authHeader = event.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
  }

  let { apps, nextId } = await getAppData();

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
        const { urls } = requestData;
        if (!urls || !Array.isArray(urls)) {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'URLs array is required' }) };
        }

        const addedOrUpdatedApps = [];
        
        for (const url of urls) {
          let scraped = null;
          let sourceStore = null;

          for (const [key, scraper] of Object.entries(scrapers)) {
            if (scraper.urlPattern.test(url)) {
              console.log(`Scraping ${url} with ${scraper.name} scraper`);
              scraped = await scraper.scrape(url);
              sourceStore = key;
              if (scraped) {
                scraped.sourceUrl = url;
                scraped.sourceStore = scraper.name; // Use friendly name
              }
              break;
            }
          }
          
          if (scraped) {
            let existingApp = apps.find(app => 
              app.sourceUrls && app.sourceUrls[sourceStore] === url
            );

            if (existingApp) {
              // Update existing app
              existingApp.title = scraped.title || existingApp.title;
              existingApp.description = scraped.description || existingApp.description;
              existingApp.shortDescription = scraped.description ? scraped.description.substring(0, 200) + (scraped.description.length > 200 ? '...' : '') : existingApp.shortDescription;
              existingApp.iconUrl = scraped.iconUrl || existingApp.iconUrl;
              existingApp.developer = scraped.developer || existingApp.developer;
              existingApp.category = categorizeApp(existingApp.title, existingApp.description, scraped.category) || existingApp.category;
              existingApp.rating = scraped.rating || existingApp.rating;
              existingApp.downloadUrl = scraped.downloadUrl || existingApp.downloadUrl;
              existingApp.version = scraped.version || existingApp.version;
              existingApp.fileSize = scraped.fileSize || existingApp.fileSize;
              existingApp.screenshots = scraped.screenshots || existingApp.screenshots;
              existingApp.updatedAt = new Date().toISOString();
              addedOrUpdatedApps.push(existingApp); 
            } else {
              // Add new app
              const newApp = {
                id: nextId++,
                packageName: generatePackageName(scraped.title || 'Unknown App', scraped.developer || 'Unknown'),
                title: scraped.title || 'Unknown App',
                description: scraped.description || 'No description available',
                shortDescription: scraped.description ? 
                  scraped.description.substring(0, 200) + (scraped.description.length > 200 ? '...' : '') : 
                  'No description available',
                version: scraped.version || '1.0.0',
                versionCode: 1,
                category: categorizeApp(scraped.title || '', scraped.description || '', scraped.category),
                developer: scraped.developer || 'Unknown Developer',
                rating: scraped.rating || 0,
                downloadCount: Math.floor(Math.random() * 1000) + 100, // Random for demo
                fileSize: scraped.fileSize || null,
                downloadUrl: scraped.downloadUrl || null,
                iconUrl: scraped.iconUrl || null,
                featured: false,
                active: true,
                sourceUrls: {
                  meta: scraped.sourceStore === 'Meta Quest Store' ? scraped.sourceUrl : null,
                  sidequest: scraped.sourceStore === 'SideQuest' ? scraped.sourceUrl : null,
                  steam: scraped.sourceStore === 'Steam VR' ? scraped.sourceUrl : null,
                  direct: scraped.downloadUrl
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                screenshots: scraped.screenshots || []
              };
              apps.push(newApp);
              addedOrUpdatedApps.push(newApp);
            }
          } else {
            console.log('Skipping failed scrape for URL:', url);
          }
        }\n
        await setAppData({ apps, nextId });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Added/Updated ${addedOrUpdatedApps.length} apps`,
            apps: addedOrUpdatedApps.map(app => ({
              id: app.id,
              title: app.title,
              developer: app.developer,
              category: app.category,
              sourceStore: Object.keys(app.sourceUrls).find(key => app.sourceUrls[key])
            }))\n          })\n        };\n\n      } else if (requestData.action === 'add-manual') {\n        const { appData } = requestData;\n        \n        const newApp = {\n          id: nextId++,\n          packageName: appData.packageName || generatePackageName(appData.title, appData.developer),\n          title: appData.title,\n          description: appData.description,\n          shortDescription: appData.shortDescription || appData.description?.substring(0, 200),\n          version: appData.version || '1.0.0',\n          versionCode: appData.versionCode || 1,\n          category: appData.category || 'Games',\n          developer: appData.developer,\n          rating: appData.rating || 0,\n          downloadCount: appData.downloadCount || 0,\n          fileSize: appData.fileSize || null,\n          downloadUrl: appData.downloadUrl,\n          iconUrl: appData.iconUrl,\n          featured: appData.featured || false,\n          active: true,\n          sourceUrls: appData.sourceUrls || {},\n          createdAt: new Date().toISOString(),\n          updatedAt: new Date().toISOString(),\n          screenshots: appData.screenshots || []\n        };\n\n        apps.push(newApp);\n        await setAppData({ apps, nextId });\n\n        return {\n          statusCode: 200,\n          headers,\n          body: JSON.stringify({\n            success: true,\n            message: 'App added successfully',\n            app: newApp\n          })\n        };\n      }\n\n    } catch (error) {\n      console.error('Add app error:', error);\n      return {\n        statusCode: 500,\n        headers,\n        body: JSON.stringify({\n          error: 'Internal server error',\n          message: error.message\n        })\n      };\n    }\n  }\n\n  if (httpMethod === 'PUT') {\n    try {\n      const { id } = queryStringParameters;\n      const appId = parseInt(id);\n      const updatedData = JSON.parse(body);\n\n      const appIndex = apps.findIndex(app => app.id === appId);\n      if (appIndex === -1) {\n        return { statusCode: 404, headers, body: JSON.stringify({ error: 'App not found' }) };\n      }\n\n      // Merge existing data with updated data\n      apps[appIndex] = {\n        ...apps[appIndex],\n        ...updatedData,\n        updatedAt: new Date().toISOString()\n      };\n\n      await setAppData({ apps, nextId });\n\n      return {\n        statusCode: 200,\n        headers,\n        body: JSON.stringify({ success: true, message: 'App updated successfully', app: apps[appIndex] })\n      };\n\n    } catch (error) {\n      console.error('Update app error:', error);\n      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };\n    }\n  }\n\n  if (httpMethod === 'DELETE') {\n    try {\n      const { id } = queryStringParameters;\n      const appId = parseInt(id);

      const initialLength = apps.length;
      const appToDelete = apps.find(app => app.id === appId);

      if (!appToDelete) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'App not found' }) };
      }

      apps = apps.filter(app => app.id !== appId);

      await setAppData({ apps, nextId });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: `App \'${appToDelete.title}\' deleted successfully` })
      };

    } catch (error) {
      console.error('Delete app error:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal server error', message: error.message }) };
    }\n  }\n
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};