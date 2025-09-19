const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrape app data from various VR store URLs
 */
async function scrapeAppFromUrl(url) {
    try {
        console.log(`Starting scrape for URL: ${url}`);
        
        // Determine which scraper to use based on URL
        if (url.includes('oculus.com') || url.includes('meta.com')) {
            return await scrapeMetaQuestStore(url);
        } else if (url.includes('sidequestvr.com')) {
            return await scrapeSideQuest(url);
        } else if (url.includes('store.steampowered.com')) {
            return await scrapeSteamVR(url);
        } else {
            throw new Error('Unsupported URL format. Please use Meta Quest Store, SideQuest, or Steam VR URLs.');
        }
    } catch (error) {
        console.error('Scraping error:', error);
        throw error;
    }
}

/**
 * Scrape Meta Quest Store
 */
async function scrapeMetaQuestStore(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        // Extract app information
        const title = $('h1[data-testid="pdp-product-name"]').text().trim() || 
                     $('h1').first().text().trim() || 
                     'Unknown App';
        
        const developer = $('[data-testid="pdp-binary-info-developer"] a').text().trim() || 
                         $('[data-testid="pdp-binary-info-developer"]').text().trim() || 
                         'Unknown Developer';
        
        const description = $('[data-testid="pdp-description"]').text().trim() || 
                           $('.description').text().trim() || 
                           'No description available';
        
        const shortDescription = description.length > 200 ? 
                               description.substring(0, 200) + '...' : 
                               description;
        
        // Try to extract file size - Meta Quest often shows this in the details
        let fileSize = null;
        const sizeText = $('body').text().match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
        if (sizeText) {
            const size = parseFloat(sizeText[1]);
            const unit = sizeText[2].toUpperCase();
            fileSize = unit === 'GB' ? size * 1024 * 1024 * 1024 : size * 1024 * 1024;
        }
        
        // Extract package name from URL
        const urlMatch = url.match(/\/(\d+)\//);
        const packageName = urlMatch ? `com.oculus.app.${urlMatch[1]}` : `com.oculus.${title.replace(/\s+/g, '').toLowerCase()}`;
        
        // Extract rating
        let rating = 0;
        const ratingMatch = $('body').text().match(/(\d\.\d)\s*(?:out of|\/)\s*5/i);
        if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
        }
        
        return {
            success: true,
            data: {
                packageName,
                title,
                description,
                shortDescription,
                developer,
                category: 'Games', // Default category, can be updated manually
                rating,
                fileSize,
                downloadUrl: url, // Use original URL as download link
                iconUrl: $('img[alt*="' + title + '"]').first().attr('src') || null,
                source: 'Meta Quest Store'
            }
        };
        
    } catch (error) {
        throw new Error(`Failed to scrape Meta Quest Store: ${error.message}`);
    }
}

/**
 * Scrape SideQuest
 */
async function scrapeSideQuest(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        const title = $('.app-title h1').text().trim() || 
                     $('h1').first().text().trim() || 
                     'Unknown App';
        
        const developer = $('.developer-name').text().trim() || 
                         $('.app-author').text().trim() || 
                         'Unknown Developer';
        
        const description = $('.app-description').text().trim() || 
                           $('.description').text().trim() || 
                           'No description available';
        
        const shortDescription = description.length > 200 ? 
                               description.substring(0, 200) + '...' : 
                               description;
        
        // SideQuest usually shows file size
        let fileSize = null;
        const sizeElement = $('.file-size, .app-size').text();
        const sizeMatch = sizeElement.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
        if (sizeMatch) {
            const size = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            fileSize = unit === 'GB' ? size * 1024 * 1024 * 1024 : size * 1024 * 1024;
        }
        
        // Extract package name
        const packageName = $('.package-name').text().trim() || 
                           `com.sidequest.${title.replace(/\s+/g, '').toLowerCase()}`;
        
        // Extract rating
        let rating = 0;
        const ratingText = $('.rating, .stars').text();
        const ratingMatch = ratingText.match(/(\d\.\d)/);
        if (ratingMatch) {
            rating = parseFloat(ratingMatch[1]);
        }
        
        // Try to get direct download URL
        const downloadUrl = $('.download-btn, .download-link').attr('href') || url;
        
        return {
            success: true,
            data: {
                packageName,
                title,
                description,
                shortDescription,
                developer,
                category: 'Games',
                rating,
                fileSize,
                downloadUrl,
                iconUrl: $('.app-icon img, .app-image img').first().attr('src') || null,
                source: 'SideQuest'
            }
        };
        
    } catch (error) {
        throw new Error(`Failed to scrape SideQuest: ${error.message}`);
    }
}

/**
 * Scrape Steam VR
 */
async function scrapeSteamVR(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        
        const title = $('.apphub_AppName').text().trim() || 
                     $('h1').first().text().trim() || 
                     'Unknown App';
        
        const developer = $('.dev_row .summary a').first().text().trim() || 
                         'Unknown Developer';
        
        const description = $('.game_description_snippet').text().trim() || 
                           $('.game_area_description').text().trim() || 
                           'No description available';
        
        const shortDescription = description.length > 200 ? 
                               description.substring(0, 200) + '...' : 
                               description;
        
        // Steam usually shows system requirements which might include file size
        let fileSize = null;
        const sysReqs = $('.game_area_sys_req').text();
        const sizeMatch = sysReqs.match(/(\d+(?:\.\d+)?)\s*(MB|GB)/i);
        if (sizeMatch) {
            const size = parseFloat(sizeMatch[1]);
            const unit = sizeMatch[2].toUpperCase();
            fileSize = unit === 'GB' ? size * 1024 * 1024 * 1024 : size * 1024 * 1024;
        }
        
        // Extract app ID from URL for package name
        const appIdMatch = url.match(/\/app\/(\d+)\//);
        const packageName = appIdMatch ? 
                           `com.steam.vr.${appIdMatch[1]}` : 
                           `com.steam.vr.${title.replace(/\s+/g, '').toLowerCase()}`;
        
        return {
            success: true,
            data: {
                packageName,
                title,
                description,
                shortDescription,
                developer,
                category: 'Games',
                rating: 0, // Steam uses different rating system
                fileSize,
                downloadUrl: url, // Steam URLs don't provide direct downloads
                iconUrl: $('.game_header_image').attr('src') || null,
                source: 'Steam VR'
            }
        };
        
    } catch (error) {
        throw new Error(`Failed to scrape Steam VR: ${error.message}`);
    }
}

/**
 * Get file size from URL headers
 */
async function getFileSizeFromUrl(url) {
    try {
        const response = await axios.head(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const contentLength = response.headers['content-length'];
        if (contentLength) {
            return parseInt(contentLength);
        }
        
        return null;
    } catch (error) {
        console.error('Error getting file size:', error.message);
        return null;
    }
}

/**
 * Format file size in bytes to human readable format
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    
    return `${size.toFixed(2)} ${sizes[i]}`;
}

/**
 * Parse file size string to bytes
 */
function parseFileSize(sizeString) {
    if (!sizeString) return null;
    
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)/i);
    if (!match) return null;
    
    const size = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    switch (unit) {
        case 'B': return size;
        case 'KB': return size * 1024;
        case 'MB': return size * 1024 * 1024;
        case 'GB': return size * 1024 * 1024 * 1024;
        default: return null;
    }
}

module.exports = {
    scrapeAppFromUrl,
    scrapeMetaQuestStore,
    scrapeSideQuest,
    scrapeSteamVR,
    getFileSizeFromUrl,
    formatFileSize,
    parseFileSize
};