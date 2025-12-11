const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('JSON API Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার আমেরিকান Session ID (ঠিক করা আছে)
// **********************************************************
const RAW_SESSION_ID = "79630939794:kzcTqdY4zvT8vX:27:AYj0BSlNTQ_SRrB57qq-6Pp42Yu7caxHu32PfgVUwA"; 
// **********************************************************

const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

async function getInstagramData(url) {
    console.log("🔍 Converting to JSON API:", url);

    // ১. লিংক ক্লিন করা
    let cleanUrl = url.split('?')[0].replace(/\/$/, '');
    
    // ২. জাদুকরী প্যারামিটার (JSON ডেটা পাওয়ার জন্য)
    const jsonUrl = `${cleanUrl}/?__a=1&__d=dis`;

    console.log("🔗 Fetching JSON:", jsonUrl);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-Requested-With': 'XMLHttpRequest',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors'
    };

    try {
        const response = await axios.get(jsonUrl, { headers });
        const data = response.data;

        // ৩. JSON এর ভেতর থেকে ভিডিও বের করা
        let videoUrl = null;
        let imageUrl = null;
        let items = null;

        // ডাটা স্ট্রাকচার চেক করা (Items অথবা GraphQL)
        if (data.items) {
            items = data.items[0];
        } else if (data.graphql && data.graphql.shortcode_media) {
            items = data.graphql.shortcode_media;
        }

        if (!items) throw new Error("Invalid JSON response");

        // ভিডিও খোঁজা (Video Versions এর ভেতর)
        if (items.video_versions && items.video_versions.length > 0) {
            // সেরা কোয়ালিটির ভিডিও নেওয়া
            videoUrl = items.video_versions[0].url;
            console.log("✅ Video found in JSON!");
        } else if (items.is_video && items.video_url) {
            videoUrl = items.video_url;
            console.log("✅ Video found via direct url!");
        }

        // ছবি খোঁজা (ব্যাকআপ)
        if (items.image_versions2 && items.image_versions2.candidates) {
            imageUrl = items.image_versions2.candidates[0].url;
        } else if (items.display_url) {
            imageUrl = items.display_url;
        }

        // ৪. রেজাল্ট রিটার্ন
        if (videoUrl) {
            // লিংক ক্লিন করা
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
            
            // টাইপ 'video' পাঠানো হচ্ছে
            return { type: 'video', video: videoUrl, thumbnail: imageUrl };
        } 
        else if (imageUrl) {
            console.log("⚠️ JSON returned only photo.");
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            throw new Error("No media found in JSON.");
        }

    } catch (error) {
        console.error("❌ JSON Method Failed:", error.message);
        // যদি JSON ফেইল করে, ব্যাকআপ হিসেবে HTML মেথড চালাবে
        return await getInstagramHTMLFallback(url);
    }
}

// ব্যাকআপ ফাংশন (যদি JSON ফেইল করে)
async function getInstagramHTMLFallback(url) {
    console.log("⚠️ Trying HTML Fallback...");
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`
    };
    
    try {
        const response = await axios.get(url, { headers });
        const html = response.data;
        
        // শুধু ব্রুট ফোর্স চেক (.mp4 আছে কিনা)
        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
        if (mp4Match && mp4Match[0]) {
            console.log("✅ HTML Fallback found video!");
            let vid = mp4Match[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'video', video: vid, thumbnail: "" };
        }
        throw new Error("All methods failed.");
    } catch (e) {
        throw new Error("Final Fail.");
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
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)' }
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
