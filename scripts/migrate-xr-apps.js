#!/usr/bin/env node

/**
 * XR Directory App Migration Script
 * Migrates apps from XRDirectory structure to PicoZen-Server database
 * 
 * Usage: node scripts/migrate-xr-apps.js
 */

const path = require('path');
const fs = require('fs').promises;

// Import database helpers
const database = require('../src/database');

// Comprehensive list of VR/XR educational applications
// Based on common apps used in VR labs and educational institutions
const xrApps = [
  // Educational & Training Apps
  {
    packageName: "com.ubisim.player",
    title: "UbiSim",
    description: "UbiSim is a VR nursing simulation platform that provides immersive clinical training experiences. Practice essential nursing skills in a safe, virtual environment with realistic patient scenarios, medical equipment, and clinical procedures.\n\nKey Features:\n• Immersive VR nursing simulations\n• Realistic patient interactions\n• Medical equipment training\n• Clinical procedure practice\n• Safe learning environment\n• Professional development tools\n• Comprehensive skill assessment\n\nPerfect for nursing education, professional development, and clinical skills training. Experience hands-on learning without real-world consequences.",
    shortDescription: "Immersive VR nursing simulation platform for clinical training and skill development",
    version: "1.18.0.157",
    versionCode: "118000157",
    category: "Education",
    categoryName: "Education",
    developer: "UbiSim",
    rating: 4.8,
    downloadCount: 1250,
    fileSize: 157286400,
    downloadUrl: "https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk",
    iconUrl: "https://scontent-lga3-3.oculuscdn.com/v/t64.5771-25/57570314_1220899138305712_3549230735456268391_n.jpg",
    featured: true,
    tags: ["nursing", "medical", "training", "simulation", "healthcare", "education"]
  },
  {
    packageName: "com.immersivevreducation.apolloxi",
    title: "Apollo 11 VR",
    description: "Experience the Apollo 11 mission like never before in this immersive VR experience. Walk on the lunar surface, explore the command module, and relive one of humanity's greatest achievements.\n\nEducational Features:\n• Historically accurate recreation\n• Interactive mission timeline\n• Educational content about space exploration\n• Immersive lunar surface experience\n• Command module exploration\n• Mission control experience\n\nPerfect for space science education, history lessons, and inspiring the next generation of explorers.",
    shortDescription: "Immersive VR recreation of the Apollo 11 moon landing mission",
    version: "1.2.0",
    versionCode: "12000",
    category: "Education",
    categoryName: "Education", 
    developer: "Immersive VR Education",
    rating: 4.6,
    downloadCount: 850,
    fileSize: 245760000,
    downloadUrl: "/apps/apollo11vr.apk",
    iconUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/440860/header.jpg",
    featured: true,
    tags: ["space", "history", "nasa", "moon", "apollo", "education", "science"]
  },
  {
    packageName: "com.labster.vr",
    title: "Labster VR",
    description: "Virtual science laboratory experiences for students and educators. Conduct experiments safely in VR with realistic lab equipment and procedures.\n\nLab Subjects:\n• Chemistry experiments\n• Biology dissections\n• Physics simulations\n• Medical procedures\n• Safety training\n• Equipment familiarization\n\nIdeal for schools without full lab facilities or for safe practice before real experiments.",
    shortDescription: "Virtual science laboratory for safe educational experiments",
    version: "2.1.5",
    versionCode: "21500",
    category: "Education",
    categoryName: "Education",
    developer: "Labster",
    rating: 4.4,
    downloadCount: 620,
    fileSize: 180224000,
    downloadUrl: "/apps/labster.apk",
    iconUrl: "https://images.crunchbase.com/image/upload/c_lpad,f_auto,q_auto:eco,dpr_1/v1455203091/zssqo6aqukgdqjklvjfp.png",
    featured: true,
    tags: ["science", "laboratory", "chemistry", "biology", "physics", "experiments"]
  },
  {
    packageName: "com.google.earth.vr",
    title: "Google Earth VR",
    description: "Explore the world from entirely new perspectives in virtual reality. Walk through famous landmarks, fly over cities, stand on mountain peaks, and even soar into space.\n\nEducational Applications:\n• Geography lessons\n• Cultural exploration\n• Historical site visits\n• Environmental studies\n• Urban planning education\n• Global awareness building\n\nBring geography and social studies to life with immersive world exploration.",
    shortDescription: "Explore the entire world in virtual reality",
    version: "1.4.2",
    versionCode: "14200",
    category: "Education",
    categoryName: "Education",
    developer: "Google",
    rating: 4.7,
    downloadCount: 2150,
    fileSize: 95420000,
    downloadUrl: "/apps/googleearthvr.apk", 
    iconUrl: "https://lh3.googleusercontent.com/dB1IalJTp_MR2RvXxZqKk_HJ3QnNQaB8TnVc1vC5k8k",
    featured: true,
    tags: ["geography", "exploration", "travel", "education", "world", "google"]
  },
  {
    packageName: "com.bodyplanet.anatomy",
    title: "3D Organon VR Anatomy",
    description: "Comprehensive 3D anatomy atlas in virtual reality. Explore the human body in unprecedented detail with interactive models and educational content.\n\nFeatures:\n• Complete human anatomy\n• Interactive 3D models\n• Educational quizzes\n• System-by-system exploration\n• Medical terminology\n• Detailed descriptions\n\nEssential for medical education, nursing programs, and health science courses.",
    shortDescription: "Interactive 3D human anatomy atlas in VR",
    version: "4.2.1",
    versionCode: "42100",
    category: "Education", 
    categoryName: "Education",
    developer: "3D Organon",
    rating: 4.5,
    downloadCount: 780,
    fileSize: 312586240,
    downloadUrl: "/apps/anatomy3d.apk",
    iconUrl: "https://3dorganon.com/wp-content/uploads/2019/05/3D-Organon-VR-Anatomy.jpg",
    featured: true,
    tags: ["anatomy", "medical", "healthcare", "biology", "education", "3d"]
  },

  // VR Creation & Development Tools
  {
    packageName: "com.mozilla.hubs",
    title: "Mozilla Hubs",
    description: "Create and share virtual worlds with Mozilla Hubs. Build custom VR spaces for education, meetings, and collaboration.\n\nEducational Uses:\n• Virtual classrooms\n• Student collaboration spaces\n• Educational presentations\n• Remote learning environments\n• Creative projects\n• Social learning experiences\n\nEnable students to create and share their own virtual learning environments.",
    shortDescription: "Create and share custom virtual worlds for education",
    version: "1.8.3",
    versionCode: "18300",
    category: "Productivity",
    categoryName: "Productivity",
    developer: "Mozilla",
    rating: 4.2,
    downloadCount: 450,
    fileSize: 125829120,
    downloadUrl: "/apps/hubs.apk",
    iconUrl: "https://hubs.mozilla.com/assets/hubs-logo.svg",
    featured: false,
    tags: ["creation", "collaboration", "virtual worlds", "education", "mozilla"]
  },
  {
    packageName: "com.meta.horizon.worlds",
    title: "Horizon Worlds",
    description: "Create, explore, and connect in virtual reality with Horizon Worlds. Build interactive experiences and educational content.\n\nEducational Features:\n• World building tools\n• Scripting system\n• Collaborative creation\n• Educational templates\n• Student showcases\n• Interactive learning experiences\n\nEmpower students to become VR content creators and learn through building.",
    shortDescription: "Create and explore virtual worlds with building tools",
    version: "2.5.1",
    versionCode: "25100",
    category: "Social",
    categoryName: "Social",
    developer: "Meta",
    rating: 4.0,
    downloadCount: 1850,
    fileSize: 198656000,
    downloadUrl: "/apps/horizonworlds.apk",
    iconUrl: "https://scontent.xx.fbcdn.net/v/t39.2365-6/273126448_658396668568656_8142009380175452913_n.png",
    featured: false,
    tags: ["creation", "social", "building", "meta", "worlds", "vr"]
  },

  // Language Learning
  {
    packageName: "com.immersivevreducation.languages",
    title: "Mondly VR",
    description: "Learn languages in virtual reality with immersive conversations and realistic scenarios. Practice speaking with virtual characters in lifelike environments.\n\nLanguage Learning Features:\n• 30+ languages available\n• Conversation practice\n• Realistic scenarios\n• Speech recognition\n• Cultural immersion\n• Progress tracking\n\nRevolutionize language education with immersive VR conversations.",
    shortDescription: "Learn languages through immersive VR conversations",
    version: "3.1.4",
    versionCode: "31400",
    category: "Education",
    categoryName: "Education",
    developer: "ATi Studios",
    rating: 4.3,
    downloadCount: 920,
    fileSize: 156672000,
    downloadUrl: "/apps/mondlyvr.apk",
    iconUrl: "https://mondly.com/images/mondly-vr-logo.png",
    featured: true,
    tags: ["language", "learning", "conversation", "education", "multilingual"]
  },

  // Art & Creativity
  {
    packageName: "com.google.tiltbrush",
    title: "Tilt Brush",
    description: "Paint in 3D space with virtual reality brushes and tools. Create stunning artwork that surrounds you in three dimensions.\n\nEducational Applications:\n• Art education\n• 3D visualization\n• Creative expression\n• Spatial thinking development\n• STEAM integration\n• Portfolio creation\n\nInspire creativity and teach spatial concepts through 3D art creation.",
    shortDescription: "Paint and create art in 3D virtual reality space",
    version: "23.2.0",
    versionCode: "232000",
    category: "Entertainment",
    categoryName: "Entertainment",
    developer: "Google",
    rating: 4.6,
    downloadCount: 1340,
    fileSize: 187392000,
    downloadUrl: "/apps/tiltbrush.apk",
    iconUrl: "https://lh3.googleusercontent.com/tiltbrush-icon.png",
    featured: true,
    tags: ["art", "creativity", "3d", "painting", "google", "steam"]
  },
  {
    packageName: "com.oculus.medium",
    title: "Medium",
    description: "Sculpt, model, paint, and create in VR. Medium is a comprehensive 3D creation tool that lets you build detailed models and artwork.\n\nCreative Features:\n• 3D sculpting tools\n• Painting and texturing\n• Model creation\n• Export capabilities\n• Collaboration features\n• Educational tutorials\n\nTeach 3D modeling, sculpture, and digital art creation in an intuitive VR environment.",
    shortDescription: "Professional 3D sculpting and modeling in VR",
    version: "2.7.0",
    versionCode: "27000",
    category: "Entertainment",
    categoryName: "Entertainment",
    developer: "Meta",
    rating: 4.4,
    downloadCount: 670,
    fileSize: 234881024,
    downloadUrl: "/apps/medium.apk",
    iconUrl: "https://scontent.xx.fbcdn.net/v/t39.2365-6/medium-icon.png",
    featured: false,
    tags: ["sculpting", "3d", "modeling", "art", "creation", "professional"]
  },

  // History & Cultural Education
  {
    packageName: "com.timelooper.titanic",
    title: "Titanic VR",
    description: "Explore the Titanic in unprecedented detail. Walk the decks, explore the interior, and learn about the ship's history through immersive storytelling.\n\nEducational Content:\n• Historical accuracy\n• Interactive timeline\n• Passenger stories\n• Ship construction details\n• Disaster simulation\n• Cultural impact lessons\n\nBring history to life with detailed historical recreation and storytelling.",
    shortDescription: "Explore the Titanic and learn its history in VR",
    version: "1.3.2",
    versionCode: "13200",
    category: "Education",
    categoryName: "Education",
    developer: "Timelooper",
    rating: 4.1,
    downloadCount: 380,
    fileSize: 298745856,
    downloadUrl: "/apps/titanicvr.apk",
    iconUrl: "https://timelooper.com/titanic-vr-icon.jpg",
    featured: false,
    tags: ["history", "titanic", "historical", "education", "storytelling"]
  },

  // Science & STEM
  {
    packageName: "com.nanome.app",
    title: "Nanome",
    description: "Visualize and manipulate molecular structures in virtual reality. Perfect for chemistry education and molecular biology studies.\n\nSTEM Features:\n• Molecular visualization\n• Interactive chemistry\n• Protein structure analysis\n• Educational simulations\n• Collaborative research\n• Scientific accuracy\n\nAdvanced chemistry and biology education through molecular VR visualization.",
    shortDescription: "Molecular visualization and chemistry education in VR",
    version: "1.15.2",
    versionCode: "115200",
    category: "Education",
    categoryName: "Education",
    developer: "Nanome Inc.",
    rating: 4.2,
    downloadCount: 290,
    fileSize: 145408000,
    downloadUrl: "/apps/nanome.apk",
    iconUrl: "https://nanome.ai/wp-content/uploads/2019/nanome-logo.png",
    featured: false,
    tags: ["chemistry", "molecules", "science", "stem", "biology", "research"]
  },

  // Virtual Field Trips
  {
    packageName: "com.google.expeditions",
    title: "Google Expeditions",
    description: "Take virtual field trips to anywhere in the world. Explore historical sites, natural wonders, and educational locations without leaving the classroom.\n\nExpedition Features:\n• 1000+ virtual trips\n• Guided educational content\n• Historical locations\n• Natural wonders\n• Cultural sites\n• STEM locations\n\nEnable immersive field trips to enhance any curriculum subject.",
    shortDescription: "Virtual field trips to educational locations worldwide",
    version: "2.8.1",
    versionCode: "28100",
    category: "Education",
    categoryName: "Education",
    developer: "Google for Education",
    rating: 4.5,
    downloadCount: 1680,
    fileSize: 167772160,
    downloadUrl: "/apps/expeditions.apk",
    iconUrl: "https://lh3.googleusercontent.com/expeditions-icon.png",
    featured: true,
    tags: ["field trips", "exploration", "education", "travel", "google", "curriculum"]
  },

  // Productivity & Collaboration
  {
    packageName: "com.microsoft.mesh",
    title: "Microsoft Mesh",
    description: "Collaborate in mixed reality with Microsoft Mesh. Join virtual meetings, share 3D content, and work together in immersive environments.\n\nCollaboration Features:\n• Virtual meetings\n• 3D content sharing\n• Remote collaboration\n• Educational presentations\n• Cross-platform support\n• Enterprise integration\n\nEnable new forms of educational collaboration and remote learning.",
    shortDescription: "Mixed reality collaboration and virtual meetings",
    version: "1.4.0",
    versionCode: "14000",
    category: "Productivity",
    categoryName: "Productivity",
    developer: "Microsoft",
    rating: 4.0,
    downloadCount: 520,
    fileSize: 198656000,
    downloadUrl: "/apps/mesh.apk",
    iconUrl: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/mesh-icon.png",
    featured: false,
    tags: ["collaboration", "meetings", "microsoft", "productivity", "remote"]
  },

  // Custom YCCC VR Lab Apps
  {
    packageName: "com.ycccrlab.demo",
    title: "YCCC VR Demo",
    description: "A demonstration VR application showcasing the capabilities of the YCCC VR Lab. Features immersive environments and interactive elements designed for educational purposes.\n\nDemo Features:\n• VR Lab showcase\n• Interactive tutorials\n• Educational demonstrations\n• Technology overview\n• Student projects\n• VR best practices\n\nIntroduce students and visitors to VR technology and educational applications.",
    shortDescription: "Educational VR demonstration app for YCCC VR Lab",
    version: "1.0.0",
    versionCode: "10000",
    category: "Education",
    categoryName: "Education",
    developer: "YCCC VR Lab",
    rating: 4.8,
    downloadCount: 120,
    fileSize: 75497472,
    downloadUrl: "/apps/ycccdemo.apk",
    iconUrl: "https://via.placeholder.com/512x512/4A90E2/FFFFFF?text=YCCC+VR",
    featured: true,
    tags: ["demo", "yccc", "vr lab", "education", "showcase"]
  },
  {
    packageName: "com.ycccrlab.training",
    title: "VR Training Simulator",
    description: "Comprehensive VR training simulator for various educational scenarios. Practice skills safely in virtual environments before real-world application.\n\nTraining Modules:\n• Safety procedures\n• Equipment operation\n• Emergency response\n• Skill assessment\n• Progress tracking\n• Certification preparation\n\nProvide hands-on training without real-world risks or equipment costs.",
    shortDescription: "Multi-purpose VR training simulator for education",
    version: "2.1.0",
    versionCode: "21000",
    category: "Education",
    categoryName: "Education",
    developer: "YCCC VR Lab",
    rating: 4.6,
    downloadCount: 85,
    fileSize: 145408000,
    downloadUrl: "/apps/vrtraining.apk",
    iconUrl: "https://via.placeholder.com/512x512/2E8B57/FFFFFF?text=VR+Training",
    featured: true,
    tags: ["training", "simulation", "safety", "yccc", "education", "skills"]
  }
];

// Categories to create
const categories = [
  {
    name: "Education",
    description: "Educational and training applications for VR learning",
    iconUrl: "🎓",
    displayOrder: 1
  },
  {
    name: "Entertainment", 
    description: "Creative and artistic VR applications",
    iconUrl: "🎨",
    displayOrder: 2
  },
  {
    name: "Productivity",
    description: "Collaboration and productivity tools for VR",
    iconUrl: "💼", 
    displayOrder: 3
  },
  {
    name: "Social",
    description: "Social VR applications and virtual worlds",
    iconUrl: "👥",
    displayOrder: 4
  },
  {
    name: "Games",
    description: "VR games and interactive experiences", 
    iconUrl: "🎮",
    displayOrder: 5
  },
  {
    name: "Tools",
    description: "Utility applications and development tools",
    iconUrl: "🔧",
    displayOrder: 6
  }
];

async function migrateXRApps() {
  try {
    console.log('🚀 Starting XR Apps migration...');
    
    // Initialize database
    await database.initDatabase();
    console.log('✅ Database initialized');
    
    // Create categories first
    console.log('📂 Creating categories...');
    for (const category of categories) {
      try {
        await database.dbHelpers.createCategory(category);
        console.log(`   ✅ Created category: ${category.name}`);
      } catch (error) {
        console.log(`   ⚠️  Category ${category.name} might already exist`);
      }
    }
    
    // Add apps
    console.log('📱 Adding VR/XR applications...');
    let successCount = 0;
    let errorCount = 0;
    
    for (const app of xrApps) {
      try {
        const appData = {
          package_name: app.packageName,
          title: app.title,
          description: app.description,
          short_description: app.shortDescription,
          version: app.version,
          version_code: parseInt(app.versionCode),
          category: app.category,
          category_name: app.categoryName,
          developer: app.developer,
          rating: app.rating,
          download_count: app.downloadCount,
          file_size: app.fileSize,
          download_url: app.downloadUrl,
          icon_url: app.iconUrl,
          featured: app.featured ? 1 : 0,
          active: 1,
          tags: app.tags ? app.tags.join(',') : ''
        };
        
        await database.dbHelpers.createApp(appData);
        console.log(`   ✅ Added: ${app.title} (${app.developer})`);
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to add ${app.title}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('🎉 Migration completed!');
    console.log(`   ✅ Successfully added: ${successCount} apps`);
    console.log(`   ❌ Errors: ${errorCount} apps`);
    console.log(`   📊 Total categories: ${categories.length}`);
    
    // Display summary
    const totalApps = await database.dbHelpers.getApps(1, 1000);
    console.log(`   📱 Total apps in database: ${totalApps.apps.length}`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = { migrateXRApps, xrApps, categories };

// Run migration if called directly
if (require.main === module) {
  migrateXRApps()
    .then(() => {
      console.log('✨ XR Apps migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}