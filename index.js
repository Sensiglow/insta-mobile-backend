const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Fixed Session Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার কপি করা Session ID (যেমন আছে তেমনই থাক)
// **********************************************************
const RAW_SESSION_ID = "79712128620%3AtQPz0VzkjZreXf%3A5%3AAYiK33MTyLQ9hTMpf5lt6pXhTAPaDn5gifALYQEUNg"; 
// **********************************************************

// সেশন আইডি ঠিক করার লজিক
const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

async function getInstagramData(url) {
    console.log("🔍 Fetching with Session ID:", REAL_SESSION_ID.substring(0, 10) + "...");

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`, // এখন সঠিক আইডি যাবে
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1'
    };

    try {
        const response = await axios.get(url, { headers });
        const html = response.data;

        let videoUrl = null;
        let imageUrl = null;

        // ১. video_url খোঁজা (JSON)
        const videoMatch = html.match(/"video_url":"([^"]+)"/);
        if (videoMatch && videoMatch[1]) {
            videoUrl = videoMatch[1];
        }

        // ২. og:video খোঁজা
        if (!videoUrl) {
            const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch && metaMatch[1]) {
                videoUrl = metaMatch[1];
            }
        }

        // ৩. Deep Search (video_versions) - রিলস এর জন্য শক্তিশালী
        if (!videoUrl) {
            const deepMatch = html.match(/"video_versions":\[\{"type":\d+,"url":"([^"]+)"/);
            if (deepMatch && deepMatch[1]) {
                videoUrl = deepMatch[1];
            }
        }

        // ৪. ছবি খোঁজা
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }

        // রেজাল্ট তৈরি
        if (videoUrl) {
            console.log("✅ Video Found!");
            // লিংক ক্লিন করা
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
            
            return { type: 'video', video: videoUrl, thumbnail: imageUrl };
        } 
        else if (imageUrl) {
            console.log("⚠️ Only Photo Found. Check Session validity.");
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            if(html.includes("login")) {
                throw new Error("Session ID Expired or Invalid.");
            }
            throw new Error("No media found.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw new Error("Failed to fetch. Instagram blocked request.");
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
        res.status(500).json({ success: false, error: "Server Error: " + error.message });
    }
});

// ডাইরেক্ট ডাউনলোড স্ট্রিম
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
