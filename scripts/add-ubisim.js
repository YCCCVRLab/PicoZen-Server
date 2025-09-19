const { initDatabase, addApp } = require('../src/database');

async function addUbiSim() {
    try {
        await initDatabase();
        
        const ubiSimData = {
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
            fileSize: null, // Will be determined when downloaded
            downloadUrl: 'https://ubisimstreamingprod.blob.core.windows.net/builds/UbiSimPlayer-1.18.0.157.apk?sv=2023-11-03&spr=https,http&se=2026-01-22T13%3A54%3A34Z&sr=b&sp=r&sig=fWimVufXCv%2BG6peu4t4R1ooXF37BEGVm2IS9e%2Fntw%2BI%3D',
            iconUrl: 'https://scontent-lga3-3.oculuscdn.com/v/t64.5771-25/57570314_1220899138305712_3549230735456268391_n.jpg?stp=dst-jpg_q92_s720x720_tt6&_nc_cat=108&ccb=1-7&_nc_sid=6e7a0a&_nc_ohc=abiM3cUS1t0Q7kNvwEG6f1M&_nc_oc=Adlp9UfoNVCqrK-SF2vUQyBzNMkhhmJ3jvqEt7cfDM_qYnrQBVzTmcC-E25FLjrIr8Y&_nc_zt=3&_nc_ht=scontent-lga3-3.oculuscdn.com&oh=00_AfbbeH7p7KL9MnwLkOJPJMiKRTOgGj_LNCz46TKiUK_knA&oe=68D3347B'
        };
        
        const appId = await addApp(ubiSimData);
        
        // Add screenshots
        const { getDB } = require('../src/database');
        const db = getDB();
        
        // Add the promotional video as a screenshot entry
        db.run(
            'INSERT INTO screenshots (app_id, image_url, caption, display_order) VALUES (?, ?, ?, ?)',
            [appId, 'https://scontent-lga3-1.oculuscdn.com/v/t64.7195-25/38984472_169844144659621_3902083327436685927_n.mp4?_nc_cat=103&ccb=1-7&_nc_sid=b20b63&_nc_ohc=UdTZVSh8_P4Q7kNvwHMKhiH&_nc_oc=AdlRAoAmsizYNq9JdGRXgsNIUvbASw06CefWGFpJ_Md_5lN46DHggxXasu8cDDC95fM&_nc_zt=28&_nc_ht=scontent-lga3-1.oculuscdn.com&_nc_gid=vM72Tx9O81wgigJ8zr_kMw&oh=00_AfbWIvC-TEvNv-F_qmail5Z_qk8odQ1zwY_rymHdHKupPg&oe=68D33CB7', 'UbiSim VR Training Demo', 0]
        );
        
        // Set as featured
        db.run('UPDATE apps SET featured = 1 WHERE id = ?', [appId]);
        
        console.log('✅ UbiSim added successfully with ID:', appId);
        console.log('🌟 Set as featured app');
        
    } catch (error) {
        console.error('❌ Error adding UbiSim:', error);
    }
}

// Run if called directly
if (require.main === module) {
    addUbiSim();
}

module.exports = { addUbiSim };