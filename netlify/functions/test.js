exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PicoZen API Server is working!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        availableEndpoints: [
          'GET /api/test - This test endpoint',
          'GET /api/apps - List all VR apps',
          'GET /api/categories - List app categories',
          'GET /api/download/:id - Download app APK',
          'GET /api/init-data - Initialize app store data'
        ],
        features: [
          '✅ UbiSim VR nursing simulation',
          '✅ Educational VR apps',
          '✅ App store functionality',
          '✅ Direct APK downloads',
          '✅ Category filtering'
        ]
      })
    };

  } catch (error) {
    console.error('Test endpoint error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Test endpoint failed',
        message: error.message
      })
    };
  }
};