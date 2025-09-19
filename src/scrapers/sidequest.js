const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape SideQuest app information from URL
 * @param {string} url - SideQuest URL
 * @returns {Object} Scraped app data
 */
async function scrapeSideQuestApp(url) {
    try {
        console.log(`Scraping SideQuest app: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract app information from SideQuest
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
            downloadUrl: null,
            storeUrl: url
        };
        
        // Title
        appData.title = 
            $('.app-title h1').text().trim() ||
            $('h1.title').text().trim() ||
            $('h1').first().text().trim() ||
            $('title').text().replace(' - SideQuest', '').trim();
        
        // Developer
        appData.developer = 
            $('.developer-name').text().trim() ||
            $('a[href*="/developer/"]').text().trim() ||
            $('.app-author').text().trim();
        
        // Description
        appData.description = 
            $('.app-description').text().trim() ||
            $('.description').text().trim() ||
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content');
        
        // Short description
        if (appData.description && appData.description.length > 500) {
            appData.shortDescription = appData.description.substring(0, 500) + '...';
        } else {
            appData.shortDescription = appData.description;
        }
        
        // Category
        appData.category = 
            $('.app-category').text().trim() ||
            $('.category-tag').text().trim() ||
            'Games'; // Default
        
        // Icon URL
        appData.iconUrl = 
            $('.app-icon img').attr('src') ||
            $('.app-image img').attr('src') ||
            $('meta[property="og:image"]').attr('content');
        
        // Screenshots
        $('.screenshot img, .gallery img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src && appData.screenshots.length < 5) {
                appData.screenshots.push({
                    url: src,
                    caption: $(elem).attr('alt') || `Screenshot ${i + 1}`
                });
            }
        });
        
        // Version
        appData.version = 
            $('.version').text().trim() ||
            $('.app-version').text().trim();
        
        // Download URL (if available)
        const downloadLink = $('a[href*=".apk"], a[download]').attr('href');
        if (downloadLink) {
            appData.downloadUrl = downloadLink.startsWith('http') ? 
                downloadLink : 
                `https://sidequestvr.com${downloadLink}`;
        }
        
        // Package name from URL
        const urlMatch = url.match(/\/app\/(\d+)/);
        if (urlMatch) {
            appData.packageName = `sidequest.app.${urlMatch[1]}`;
        }
        
        // Rating
        const ratingText = $('.rating, .stars').text();
        const ratingMatch = ratingText.match(/(\d+\.?\d*)/);
        if (ratingMatch) {
            appData.rating = parseFloat(ratingMatch[1]);
        }
        
        // Clean up data
        Object.keys(appData).forEach(key => {
            if (typeof appData[key] === 'string') {
                appData[key] = appData[key].trim() || null;
            }
        });
        
        console.log('Scraped SideQuest app data:', {
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
            source: 'SideQuest'
        };
        
    } catch (error) {
        console.error('Error scraping SideQuest app:', error.message);
        return {
            success: false,
            error: error.message,
            source: 'SideQuest'
        };
    }
}

/**
 * Check if URL is a valid SideQuest URL
 * @param {string} url - URL to check
 * @returns {boolean} True if valid SideQuest URL
 */
function isValidSideQuestUrl(url) {
    const sideQuestPatterns = [
        /^https?:\/\/(www\.)?sidequestvr\.com\/app\//,
        /^https?:\/\/(www\.)?sidequest\.com\/app\//
    ];
    
    return sideQuestPatterns.some(pattern => pattern.test(url));
}

module.exports = {
    scrapeSideQuestApp,
    isValidSideQuestUrl
};