// Categories API endpoint
const categories = [
  { id: 1, name: 'Games', description: 'VR Games and Entertainment', appCount: 0, displayOrder: 0 },
  { id: 2, name: 'Education', description: 'Learning and Training Applications', appCount: 1, displayOrder: 1 },
  { id: 3, name: 'Productivity', description: 'Work and Utility Applications', appCount: 0, displayOrder: 2 },
  { id: 4, name: 'Social', description: 'Communication and Social VR', appCount: 0, displayOrder: 3 },
  { id: 5, name: 'Health & Fitness', description: 'Exercise and Wellness Apps', appCount: 0, displayOrder: 4 },
  { id: 6, name: 'Entertainment', description: 'Media and Video Applications', appCount: 0, displayOrder: 5 },
  { id: 7, name: 'Tools', description: 'System Utilities and Tools', appCount: 0, displayOrder: 6 }
];

exports.handler = async (event, context) => {
  const { httpMethod } = event;
  
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          appCount: cat.appCount,
          displayOrder: cat.displayOrder
        }))
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