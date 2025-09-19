const { getStore } = require("@netlify/blobs");

// Default app data with UbiSim and sample apps
function getDefaultApps() {
  return [
    {
      id: 1,
      packageName: 'com.ubisim.player',
      title: 'UbiSim',
      description: `UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.

Key Features:
• Immersive VR nursing simulations
• Realistic patient interactions
• Medical equipment training
• Clinical procedure practice
• Safe learning environment
• Professional development tools
• Comprehensive skill assessment

Perfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.`,
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
    },
    {
      id: 2,
      packageName: 'com.oculus.browser',
      title: 'Oculus Browser',
      description: 'The Oculus Browser brings the full web to VR. Browse websites, watch videos, and interact with web content in an immersive virtual environment. Features include desktop-class browsing, video streaming, and web app support.',
      shortDescription: 'Browse the web in VR with full desktop functionality',
      version: '1.0.0',
      versionCode: 1,
      category: 'Tools',
      developer: 'Meta',
      rating: 4.2,
      downloadCount: 15000,
      fileSize: 89456789,
      downloadUrl: '/api/download/2',
      iconUrl: 'https://via.placeholder.com/128x128/4267B2/FFFFFF?text=OB',
      featured: false,
      active: true,
      sourceUrls: {
        meta: 'https://www.meta.com/experiences/1216061938549734/',
        sidequest: null,
        steam: null,
        direct: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screenshots: []
    },
    {
      id: 3,
      packageName: 'com.vrchat.mobile',
      title: 'VRChat',
      description: 'VRChat is a social VR platform where you can create, publish, and explore virtual worlds with other people from around the globe. Meet new friends, attend events, and express yourself through custom avatars.',
      shortDescription: 'Meet people in VR and explore thousands of worlds',
      version: '2.1.0',
      versionCode: 210,
      category: 'Social',
      developer: 'VRChat Inc.',
      rating: 4.5,
      downloadCount: 25000,
      fileSize: 234567890,
      downloadUrl: '/api/download/3',
      iconUrl: 'https://via.placeholder.com/128x128/1DB954/FFFFFF?text=VC',
      featured: true,
      active: true,
      sourceUrls: {
        meta: 'https://www.meta.com/experiences/1905351616291543/',
        sidequest: 'https://sidequestvr.com/app/1/vrchat',
        steam: 'https://store.steampowered.com/app/438100/VRChat/',
        direct: null
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screenshots: []
    },
    {
      id: 4,
      packageName: 'com.unity.template.vr',
      title: 'Unity VR Template',
      description: 'A complete VR development template for Unity, perfect for learning VR app development and prototyping new experiences. Includes interaction systems, UI components, and sample scenes.',
      shortDescription: 'Learn VR development with Unity\'s comprehensive template',
      version: '1.5.0',
      versionCode: 150,
      category: 'Education',
      developer: 'Unity Technologies',
      rating: 4.3,
      downloadCount: 3500,
      fileSize: 156789012,
      downloadUrl: '/api/download/4',
      iconUrl: 'https://via.placeholder.com/128x128/000000/FFFFFF?text=U',
      featured: false,
      active: true,
      sourceUrls: {
        meta: null,
        sidequest: null,
        steam: null,
        direct: 'https://unity.com/unity/features/vr'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screenshots: []
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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const defaultApps = getDefaultApps();
    const store = getStore("picozen-app-data");
    
    // Initialize the blob store with default data
    await store.set("apps", defaultApps, { type: "json" });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'PicoZen app data initialized successfully!',
        appsCount: defaultApps.length,
        apps: defaultApps.map(app => ({
          id: app.id,
          title: app.title,
          developer: app.developer,
          category: app.category
        }))
      })
    };

  } catch (error) {
    console.error('Error initializing data:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to initialize app data',
        message: error.message
      })
    };
  }
};