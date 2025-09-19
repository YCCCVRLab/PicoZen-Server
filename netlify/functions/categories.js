const { getStore } = require("@netlify/blobs");

// Helper to get app data from blobs
async function getAppData() {
  try {
    const store = getStore("picozen-app-data");
    const blob = await store.get("apps", { type: "json" });
    
    const defaultApps = [
      {
        id: 1,
        packageName: 'com.ubisim.player',
        title: 'UbiSim',
        category: 'Education',
        developer: 'UbiSim',
        active: true
      }
    ];
    
    if (!blob) {
      return { apps: defaultApps, nextId: defaultApps.length + 1 };
    }
    return { apps: blob, nextId: blob.length + 1 };
  } catch (error) {
    console.error('Error getting app data:', error);
    return { 
      apps: [
        {
          id: 1,
          packageName: 'com.ubisim.player',
          title: 'UbiSim',
          category: 'Education',
          developer: 'UbiSim',
          active: true
        }
      ], 
      nextId: 2 
    };
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method not allowed',
        allowedMethods: ['GET']
      })
    };
  }

  try {
    const { apps } = await getAppData();
    
    // Extract unique categories from apps
    const categorySet = new Set();
    apps.filter(app => app.active !== false).forEach(app => {
      if (app.category) {
        categorySet.add(app.category);
      }
    });
    
    // Create category objects with counts
    const categories = Array.from(categorySet).map(categoryName => {
      const appsInCategory = apps.filter(app => 
        app.active !== false && app.category === categoryName
      );
      
      return {
        id: categoryName.toLowerCase().replace(/\s+/g, '-'),
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        description: getCategoryDescription(categoryName),
        appCount: appsInCategory.length,
        iconUrl: getCategoryIcon(categoryName)
      };
    });
    
    // Sort categories by app count (descending) then by name
    categories.sort((a, b) => {
      if (b.appCount !== a.appCount) {
        return b.appCount - a.appCount;
      }
      return a.name.localeCompare(b.name);
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        categories: categories,
        total: categories.length
      })
    };
    
  } catch (error) {
    console.error('Categories function error:', error);
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

function getCategoryDescription(categoryName) {
  const descriptions = {
    'Education': 'Learning and training applications for VR',
    'Games': 'VR games and entertainment experiences',
    'Tools': 'Utility applications and system tools',
    'Social': 'Communication and social VR platforms',
    'Entertainment': 'Media players and entertainment apps',
    'Productivity': 'Work and productivity applications',
    'Health & Fitness': 'Exercise and wellness applications'
  };
  
  return descriptions[categoryName] || `${categoryName} applications`;
}

function getCategoryIcon(categoryName) {
  const icons = {
    'Education': '🎓',
    'Games': '🎮',
    'Tools': '🔧',
    'Social': '👥',
    'Entertainment': '🎬',
    'Productivity': '💼',
    'Health & Fitness': '💪'
  };
  
  return icons[categoryName] || '📱';
}