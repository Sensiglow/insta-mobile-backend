const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('GraphQL Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার আমেরিকান Session ID
// **********************************************************
const RAW_SESSION_ID = "79630939794:kzcTqdY4zvT8vX:27:AYj0BSlNTQ_SRrB57qq-6Pp42Yu7caxHu32PfgVUwA"; 
// **********************************************************

const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

// শর্টকোড বের করার ফাংশন
function getShortcode(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getInstagramData(url) {
    const shortcode = getShortcode(url);
    console.log("🔍 Target GraphQL Shortcode:", shortcode);

    if (!shortcode) throw new Error("Invalid Link");

    // GraphQL এর জাদুকরী লিংক
    // doc_id=8845758582119845 এটা ইনস্টাগ্রামের গোপন আইডি যা ভিডিও ডেটা দেয়
    const graphqlUrl = `https://www.instagram.com/graphql/query/?doc_id=8845758582119845&variables={"shortcode":"${shortcode}"}`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'X-IG-App-ID': '936619743392459',
        'Sec-Fetch-Site': 'same-origin'
    };

    try {
        const response = await axios.get(graphqlUrl, { headers });
        const data = response.data;

        if (!data.data || !data.data.xdt_shortcode_media) {
            throw new Error("GraphQL returned empty data.");
        }

        const media = data.data.xdt_shortcode_media;
        let videoUrl = null;
        let imageUrl = null;

        // ভিডিও খোঁজা
        if (media.video_url) {
            videoUrl = media.video_url;
            console.log("✅ Video found via GraphQL!");
        }

        // ছবি খোঁজা
        if (media.display_url) {
            imageUrl = media.display_url;
        }

        // রেজাল্ট রিটার্ন
        if (videoUrl) {
            // লিংক ক্লিন করা
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
            
            return { type: 'video', video: videoUrl, thumbnail: imageUrl };
        } 
        else if (imageUrl) {
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            throw new Error("No media found.");
        }

    } catch (error) {
        console.error("❌ GraphQL Failed:", error.message);
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
        res.status(500).json({ success: false, error: "Server Error: " + error.message });
    }
});

// ডাইরেক্ট স্ট্রিম
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
