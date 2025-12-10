const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Running! Radhe Radhe! 🙏');
});

async function getInstagramVideo(url) {
    console.log("🔍 Searching:", url);

    const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    const response = await fetch(url, { headers: headers });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // ১. প্রথমে স্ট্যান্ডার্ড মেটা ট্যাগ খোঁজা
    let videoUrl = null;
    let match = html.match(/<meta property="og:video" content="([^"]+)"/i);
    
    if (match && match[1]) {
        videoUrl = match[1];
    } 
    
    // ২. যদি না পাওয়া যায়, তাহলে জোর করে .mp4 খোঁজা (Brute Force)
    if (!videoUrl) {
        // পুরো HTML এ mp4 লিংক খুঁজছি
        const mp4Pattern = /https?:\/\/[^"']+\.mp4/g;
        const allMp4s = html.match(mp4Pattern);
        
        if (allMp4s && allMp4s.length > 0) {
            // প্রথম ভিডিও লিংকটাই আসল হয় সাধারণত
            videoUrl = allMp4s[0];
            console.log("⚡ Brute Force found video!");
        }
    }

    // ছবি খোঁজা (Thumbnail এর জন্য)
    let imageUrl = "";
    const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1].replace(/&amp;/g, '&');
    }

    // রেজাল্ট পাঠানো
    if (videoUrl) {
        // লিংক পরিষ্কার করা
        videoUrl = videoUrl.replace(/&amp;/g, '&').replace(/\\u0026/g, '&');
        return { type: 'video', url: videoUrl, thumb: imageUrl };
    } else if (imageUrl) {
        return { type: 'photo', url: imageUrl, thumb: imageUrl };
    } else {
        throw new Error("No media found!");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const result = await getInstagramVideo(url);
        console.log("✅ Found Type:", result.type);
        
        res.json({
            success: true,
            data: {
                video: result.url,
                thumbnail: result.thumb
            }
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, error: "Download Failed" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
