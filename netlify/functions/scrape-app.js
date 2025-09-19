// Web scraping function for VR store pages
const fetch = require('node-fetch');

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
        
        // Extract data using regex patterns (simplified for demo)
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

// Helper functions for data extraction
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

// SideQuest specific extractors
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

// Steam specific extractors
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
    if (urlMatch && index < 5) {
      screenshots.push({
        imageUrl: urlMatch[1],
        caption: `Screenshot ${index + 1}`,
        displayOrder: index
      });
    }
  });
  return screenshots;
}

// Main handler function
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

  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { urls } = JSON.parse(body);
    
    if (!urls || !Array.isArray(urls)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URLs array is required' })
      };
    }

    const results = [];
    
    for (const url of urls) {
      let scraped = null;
      
      // Find matching scraper
      for (const [key, scraper] of Object.entries(scrapers)) {
        if (scraper.urlPattern.test(url)) {
          console.log(`Scraping ${url} with ${scraper.name} scraper`);
          scraped = await scraper.scrape(url);
          if (scraped) {
            scraped.sourceUrl = url;
            scraped.sourceStore = scraper.name;
          }
          break;
        }
      }
      
      if (scraped) {
        results.push(scraped);
      } else {
        results.push({
          error: 'No suitable scraper found or scraping failed',
          url: url
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        results: results,
        message: `Scraped ${results.length} URLs`
      })
    };

  } catch (error) {
    console.error('Scraping function error:', error);
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