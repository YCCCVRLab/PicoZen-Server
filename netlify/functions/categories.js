// Simple categories endpoint without Netlify Blobs for now

function getDefaultCategories() {
  return [
    {
      id: 'education',
      name: 'Education',
      slug: 'education',
      description: 'Learning and training applications for VR',
      appCount: 2,
      iconUrl: '🎓'
    },
    {
      id: 'tools',
      name: 'Tools',
      slug: 'tools',
      description: 'Utility applications and system tools',
      appCount: 1,
      iconUrl: '🔧'
    },
    {
      id: 'social',
      name: 'Social',
      slug: 'social',
      description: 'Communication and social VR platforms',
      appCount: 1,
      iconUrl: '👥'
    },
    {
      id: 'games',
      name: 'Games',
      slug: 'games',
      description: 'VR games and entertainment experiences',
      appCount: 0,
      iconUrl: '🎮'
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      slug: 'entertainment',
      description: 'Media players and entertainment apps',
      appCount: 0,
      iconUrl: '🎬'
    },
    {
      id: 'productivity',
      name: 'Productivity',
      slug: 'productivity',
      description: 'Work and productivity applications',
      appCount: 0,
      iconUrl: '💼'
    },
    {
      id: 'health-fitness',
      name: 'Health & Fitness',
      slug: 'health-fitness',
      description: 'Exercise and wellness applications',
      appCount: 0,
      iconUrl: '💪'
    }
  ];
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
        allowedMethods: ['GET']
      })
    };
  }

  try {
    const categories = getDefaultCategories();
    
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
        total: categories.length,
        timestamp: new Date().toISOString()
      })
    };
    
  } catch (error) {
    console.error('Categories function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};