const { scrapeMetaQuestApp, isValidMetaQuestUrl } = require('./metaquest');
const { scrapeSideQuestApp, isValidSideQuestUrl } = require('./sidequest');

/**
 * Scrape app information from any supported store URL
 * @param {string} url - Store URL to scrape
 * @returns {Object} Scraped app data with merge suggestions
 */
async function scrapeAppFromUrl(url) {
    try {
        // Validate URL format
        if (!url || typeof url !== 'string') {
            return {
                success: false,
                error: 'Invalid URL provided'
            };
        }
        
        // Normalize URL
        url = url.trim();
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        
        let scrapeResult;
        
        // Determine which scraper to use
        if (isValidMetaQuestUrl(url)) {
            scrapeResult = await scrapeMetaQuestApp(url);
        } else if (isValidSideQuestUrl(url)) {
            scrapeResult = await scrapeSideQuestApp(url);
        } else {
            return {
                success: false,
                error: 'Unsupported URL format. Please use Meta Quest Store, SideQuest, or Steam VR URLs.',
                supportedStores: [
                    'Meta Quest Store (meta.com/experiences/...)',
                    'SideQuest (sidequestvr.com/app/...)',
                    'Steam VR (store.steampowered.com/app/...)'
                ]
            };
        }
        
        if (!scrapeResult.success) {
            return scrapeResult;
        }
        
        // Add metadata about the scraping process
        const result = {
            ...scrapeResult,
            scrapedAt: new Date().toISOString(),
            originalUrl: url,
            mergeStrategy: generateMergeStrategy(scrapeResult.data)
        };
        
        return result;
        
    } catch (error) {
        console.error('Error in scrapeAppFromUrl:', error);
        return {
            success: false,
            error: 'Failed to scrape URL: ' + error.message
        };
    }
}

/**
 * Generate merge strategy suggestions for scraped data
 * @param {Object} scrapedData - Data scraped from store
 * @returns {Object} Merge strategy recommendations
 */
function generateMergeStrategy(scrapedData) {
    const strategy = {
        recommendations: {},
        confidence: {}
    };
    
    // High confidence fields (usually accurate from stores)
    if (scrapedData.title) {
        strategy.recommendations.title = 'overwrite';
        strategy.confidence.title = 'high';
    }
    
    if (scrapedData.developer) {
        strategy.recommendations.developer = 'overwrite';
        strategy.confidence.developer = 'high';
    }
    
    if (scrapedData.iconUrl) {
        strategy.recommendations.iconUrl = 'overwrite';
        strategy.confidence.iconUrl = 'high';
    }
    
    // Medium confidence fields
    if (scrapedData.description) {
        strategy.recommendations.description = 'merge_or_overwrite';
        strategy.confidence.description = 'medium';
    }
    
    if (scrapedData.category) {
        strategy.recommendations.category = 'suggest';
        strategy.confidence.category = 'medium';
    }
    
    // Low confidence fields (might need manual review)
    if (scrapedData.packageName) {
        strategy.recommendations.packageName = 'suggest';
        strategy.confidence.packageName = 'low';
    }
    
    if (scrapedData.version) {
        strategy.recommendations.version = 'suggest';
        strategy.confidence.version = 'low';
    }
    
    return strategy;
}

/**
 * Merge scraped data with existing app data
 * @param {Object} existingData - Current app data
 * @param {Object} scrapedData - Scraped app data
 * @param {Object} userChoices - User's merge preferences
 * @returns {Object} Merged app data
 */
function mergeAppData(existingData, scrapedData, userChoices = {}) {
    const merged = { ...existingData };
    
    Object.keys(scrapedData).forEach(key => {
        if (scrapedData[key] !== null && scrapedData[key] !== undefined) {
            const choice = userChoices[key] || 'suggest';
            
            switch (choice) {
                case 'overwrite':
                    merged[key] = scrapedData[key];
                    break;
                    
                case 'merge':
                    if (key === 'description' && existingData[key]) {
                        // Merge descriptions
                        merged[key] = existingData[key] + '\\n\\n' + scrapedData[key];
                    } else if (key === 'screenshots' && existingData[key]) {
                        // Merge screenshot arrays
                        merged[key] = [...(existingData[key] || []), ...scrapedData[key]];
                    } else {
                        merged[key] = scrapedData[key];
                    }
                    break;
                    
                case 'keep':
                    // Keep existing value
                    break;
                    
                case 'suggest':
                default:
                    // Only use scraped value if existing is empty
                    if (!existingData[key]) {
                        merged[key] = scrapedData[key];
                    }
                    break;
            }
        }
    });
    
    return merged;
}

/**
 * Get supported store patterns for validation
 * @returns {Array} Array of supported URL patterns
 */
function getSupportedStores() {
    return [
        {
            name: 'Meta Quest Store',
            patterns: [
                'meta.com/experiences/',
                'oculus.com/experiences/',
                'store.facebook.com/quest/'
            ],
            example: 'https://www.meta.com/experiences/app-name/1234567890123456/'
        },
        {
            name: 'SideQuest',
            patterns: [
                'sidequestvr.com/app/',
                'sidequest.com/app/'
            ],
            example: 'https://sidequestvr.com/app/12345'
        },
        {
            name: 'Steam VR',
            patterns: [
                'store.steampowered.com/app/'
            ],
            example: 'https://store.steampowered.com/app/123456/App_Name/'
        }
    ];
}

module.exports = {
    scrapeAppFromUrl,
    mergeAppData,
    generateMergeStrategy,
    getSupportedStores,
    // Individual scrapers
    scrapeMetaQuestApp,
    scrapeSideQuestApp,
    isValidMetaQuestUrl,
    isValidSideQuestUrl
};