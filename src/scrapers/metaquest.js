const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape Meta Quest Store app information from URL
 * @param {string} url - Meta Quest Store URL
 * @returns {Object} Scraped app data
 */
async function scrapeMetaQuestApp(url) {
    try {
        console.log(`Scraping Meta Quest app: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract app information from Meta Quest Store
        const appData = {
            title: null,
            developer: null,
            description: null,
            shortDescription: null,
            category: null,
            iconUrl: null,
            screenshots: [],
            packageName: null,
            version: null,
            rating: null,
            storeUrl: url
        };
        
        // Try different selectors for title
        appData.title = 
            $('h1[data-testid="app-title"]').text().trim() ||
            $('h1.app-title').text().trim() ||
            $('h1').first().text().trim() ||
            $('title').text().replace(' | Meta Quest', '').trim();
        
        // Developer information
        appData.developer = 
            $('[data-testid="app-developer"]').text().trim() ||
            $('.developer-name').text().trim() ||
            $('a[href*="/developer/"]').text().trim();
        
        // Description
        appData.description = 
            $('[data-testid="app-description"]').text().trim() ||
            $('.app-description').text().trim() ||
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content');
        
        // Short description (first 500 chars of description)
        if (appData.description && appData.description.length > 500) {
            appData.shortDescription = appData.description.substring(0, 500) + '...';
        } else {
            appData.shortDescription = appData.description;
        }
        
        // Category
        appData.category = 
            $('[data-testid="app-category"]').text().trim() ||
            $('.category').text().trim() ||
            'Games'; // Default to Games
        
        // Icon URL
        appData.iconUrl = 
            $('[data-testid="app-icon"] img').attr('src') ||
            $('.app-icon img').attr('src') ||
            $('meta[property="og:image"]').attr('content');
        
        // Screenshots
        $('img[src*="screenshot"], img[src*="media"]').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && !src.includes('icon') && appData.screenshots.length < 5) {
                appData.screenshots.push({
                    url: src,
                    caption: $(elem).attr('alt') || `Screenshot ${i + 1}`
                });
            }
        });
        
        // Extract package name from URL if possible
        const urlMatch = url.match(/\/([a-zA-Z0-9._]+)\/(\d+)/);
        if (urlMatch) {
            appData.packageName = urlMatch[1];
        }
        
        // Rating
        const ratingText = $('[data-testid="rating"], .rating').text();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
            appData.rating = parseFloat(ratingMatch[1]);
        }
        
        // Clean up and validate data
        Object.keys(appData).forEach(key => {
            if (typeof appData[key] === 'string') {
                appData[key] = appData[key].trim() || null;
            }
        });
        
        console.log('Scraped Meta Quest app data:', {
            title: appData.title,
            developer: appData.developer,
            hasDescription: !!appData.description,
            category: appData.category,
            hasIcon: !!appData.iconUrl,
            screenshotCount: appData.screenshots.length
        });
        
        return {
            success: true,
            data: appData,
            source: 'Meta Quest Store'
        };
        
    } catch (error) {
        console.error('Error scraping Meta Quest app:', error.message);
        return {
            success: false,
            error: error.message,
            source: 'Meta Quest Store'
        };
    }
}

/**
 * Check if URL is a valid Meta Quest Store URL
 * @param {string} url - URL to check
 * @returns {boolean} True if valid Meta Quest URL
 */
function isValidMetaQuestUrl(url) {
    const metaQuestPatterns = [
        /^https?:\/\/(www\.)?meta\.com\/experiences\//,
        /^https?:\/\/(www\.)?oculus\.com\/experiences\//,
        /^https?:\/\/(www\.)?store\.facebook\.com\/quest\//
    ];
    
    return metaQuestPatterns.some(pattern => pattern.test(url));
}

module.exports = {
    scrapeMetaQuestApp,
    isValidMetaQuestUrl
};