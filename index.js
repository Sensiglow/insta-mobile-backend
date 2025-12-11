const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Aggressive Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার Session ID (যেমন আছে তেমনই থাক)
// **********************************************************
const RAW_SESSION_ID = "79712128620%3AtQPz0VzkjZreXf%3A5%3AAYiK33MTyLQ9hTMpf5lt6pXhTAPaDn5gifALYQEUNg"; 
// **********************************************************

const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

async function getInstagramData(url) {
    console.log("🔍 Scanning:", url);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
    };

    try {
        const response = await axios.get(url, { headers });
        const html = response.data;

        let videoUrl = null;
        let imageUrl = null;

        // ==========================================
        // 🔴 স্টেপ ১: ভিডিও খোঁজার সবচেয়ে শক্তিশালী উপায় (video_versions)
        // ==========================================
        // রিলস ভিডিও সাধারণত video_versions এর ভেতর থাকে
        const versionsMatch = html.match(/"video_versions":\[.*?{"type":\d+,"url":"([^"]+)"/);
        if (versionsMatch && versionsMatch[1]) {
            console.log("✅ Video found in versions!");
            videoUrl = versionsMatch[1];
        }

        // ==========================================
        // 🔴 স্টেপ ২: যদি না পায়, সরাসরি .mp4 খোঁজা (Brute Force)
        // ==========================================
        if (!videoUrl) {
            // পুরো HTML ঘেঁটে mp4 বের করা
            const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
            if (mp4Match && mp4Match[0]) {
                console.log("✅ Video found by Force Search!");
                videoUrl = mp4Match[0];
            }
        }

        // ==========================================
        // 🔴 স্টেপ ৩: সাধারণ মেটা ট্যাগ
        // ==========================================
        if (!videoUrl) {
            const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch && metaMatch[1]) {
                videoUrl = metaMatch[1];
            }
        }

        // ছবি খোঁজা
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }

        // রেজাল্ট রিটার্ন
        if (videoUrl) {
            // লিংক ক্লিন করা
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
            
            return { type: 'video', video: videoUrl, thumbnail: imageUrl };
        } 
        else if (imageUrl) {
            // যদি ভিডিও কোনোভাবেই না পায়, তখন ছবি
            console.log("⚠️ Still only photo found. Likely Geo-blocked.");
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            throw new Error("No media found.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw new Error("Failed to fetch.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getInstagramData(url);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    const type = req.query.type || 'video';
    
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream',
            headers: {
                // ভিডিও ডাউনলোড করার সময়ও সেশন ব্যবহার করা
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const ext = type === 'photo' ? 'jpg' : 'mp4';
        const contentType = type === 'photo' ? 'image/jpeg' : 'video/mp4';

        res.setHeader('Content-Disposition', `attachment; filename="insta_${Date.now()}.${ext}"`);
        res.setHeader('Content-Type', contentType);
        
        response.data.pipe(res);

    } catch (error) {
        res.status(500).send("Stream Error");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
