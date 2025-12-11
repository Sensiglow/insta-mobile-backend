const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('US Session Server Active! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার নতুন আমেরিকান Session ID (আমি বসিয়ে দিয়েছি)
// **********************************************************
const RAW_SESSION_ID = "79630939794:kzcTqdY4zvT8vX:27:AYj0BSlNTQ_SRrB57qq-6Pp42Yu7caxHu32PfgVUwA"; 
// **********************************************************

// ডিকোড করা (যাতে কোনো ভুল ফরম্যাট থাকলেও ঠিক হয়ে যায়)
const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

async function getInstagramData(url) {
    console.log("🔍 Scanning with US ID:", url);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1'
    };

    try {
        const response = await axios.get(url, { headers });
        const html = response.data;

        let videoUrl = null;
        let imageUrl = null;

        // 🔴 ভিডিও খোঁজার ৪টি ধাপ (যাতে মিস না হয়)

        // ১. video_versions (সবচেয়ে শক্তিশালী - রিলসের জন্য)
        const versionsMatch = html.match(/"video_versions":\[.*?{"type":\d+,"url":"([^"]+)"/);
        if (versionsMatch && versionsMatch[1]) {
            console.log("✅ Video found in versions!");
            videoUrl = versionsMatch[1];
        }

        // ২. og:video (ব্যাকআপ)
        if (!videoUrl) {
            const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch && metaMatch[1]) videoUrl = metaMatch[1];
        }

        // ৩. video_url (JSON)
        if (!videoUrl) {
            const jsonMatch = html.match(/"video_url":"([^"]+)"/);
            if (jsonMatch && jsonMatch[1]) videoUrl = jsonMatch[1];
        }

        // ৪. ডাইরেক্ট .mp4 খোঁজা (শেষ চেষ্টা)
        if (!videoUrl) {
            const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
            if (mp4Match && mp4Match[0]) videoUrl = mp4Match[0];
        }

        // ছবি খোঁজা
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) imageUrl = imgMatch[1];

        // রেজাল্ট রিটার্ন
        if (videoUrl) {
            // লিংক ক্লিন করা (Unicode fix)
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
            
            return { type: 'video', video: videoUrl, thumbnail: imageUrl };
        } 
        else if (imageUrl) {
            console.log("⚠️ Still only Photo found.");
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            if(html.includes("login")) throw new Error("Session Expired/Login Required");
            throw new Error("No media found.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw new Error("Instagram Blocked Request.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getInstagramData(url);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

// ডাইরেক্ট স্ট্রিম (ডাউনলোডের জন্য - 0kb ফিক্স)
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    const type = req.query.type || 'video';
    
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
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
