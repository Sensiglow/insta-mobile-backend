const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('App ID Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার আমেরিকান Session ID
// **********************************************************
const RAW_SESSION_ID = "79630939794:kzcTqdY4zvT8vX:27:AYj0BSlNTQ_SRrB57qq-6Pp42Yu7caxHu32PfgVUwA"; 
// **********************************************************

const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

async function getInstagramData(url) {
    console.log("🔍 Scanning with App ID Secret:", url);

    // লিংক ক্লিন করা
    const cleanUrl = url.split('?')[0];

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.136 Mobile Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '936619743392459', // 🔴 এটাই সেই গোপন চাবি (App ID)
        'Sec-Fetch-Site': 'same-origin',
        'Upgrade-Insecure-Requests': '1'
    };

    try {
        const response = await axios.get(cleanUrl, { headers });
        const html = response.data;

        let videoUrl = null;
        let imageUrl = null;

        // 🔴 ভিডিও খোঁজার লজিক (Brute Force Regex)
        
        // ১. সরাসরি .mp4 লিংক খোঁজা (সবচেয়ে শক্তিশালী)
        // ইনস্টাগ্রামের কোডের ভেতর এনক্রিপ্ট করা mp4 লিংক থাকে
        const mp4Pattern = /"video_url":"([^"]+)"/;
        const mp4Match = html.match(mp4Pattern);
        
        if (mp4Match && mp4Match[1]) {
            console.log("✅ Found video via video_url!");
            videoUrl = mp4Match[1];
        }

        // ২. যদি না পায়, তবে og:video দেখা
        if (!videoUrl) {
            const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch && metaMatch[1]) videoUrl = metaMatch[1];
        }

        // ৩. শেষ চেষ্টা: পুরো টেক্সটে mp4 খোঁজা
        if (!videoUrl) {
            const rawMatch = html.match(/https?:\/\/[^"']+\.mp4/);
            if (rawMatch && rawMatch[0]) {
                console.log("✅ Found video via Raw Search!");
                videoUrl = rawMatch[0];
            }
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
            // যদি ভিডিও না পাওয়া যায়
            console.log("⚠️ Only Photo found.");
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            if(html.includes("login")) throw new Error("Session Expired/Login Required");
            throw new Error("No media found. Account might be private.");
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

// ডাইরেক্ট স্ট্রিম (Direct Download Fix)
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
