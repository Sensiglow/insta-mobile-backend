const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Mobile App Server Running! Radhe Radhe! 🙏');
});

// **********************************************************
// আপনার আমেরিকান Session ID
// **********************************************************
const RAW_SESSION_ID = "79630939794:kzcTqdY4zvT8vX:27:AYj0BSlNTQ_SRrB57qq-6Pp42Yu7caxHu32PfgVUwA"; 
// **********************************************************

const REAL_SESSION_ID = decodeURIComponent(RAW_SESSION_ID);

// ১. লিংক থেকে শর্টকোড (Shortcode) বের করার ফাংশন
function getShortcode(url) {
    // লিংকের ভেতর থেকে p/ বা reel/ এর পরের অংশ নেওয়া
    const regex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// ২. মোবাইল অ্যাপ সেজে ভিডিও আনার ফাংশন
async function getInstagramData(url) {
    const shortcode = getShortcode(url);
    console.log("🔍 Target Shortcode:", shortcode);

    if (!shortcode) throw new Error("Invalid Instagram Link");

    // মোবাইল অ্যাপের গোপন API লিংক
    const apiUrl = `https://i.instagram.com/api/v1/media/info?shortcode=${shortcode}`;

    const headers = {
        // আমরা সাজব Samsung Galaxy S9 ফোন (যাতে ব্লক না করে)
        'User-Agent': 'Instagram 219.0.0.12.117 Android (28/9.0; 420dpi; 1080x1920; samsung; SM-G950F; dreamlte; samsungexynos8895; en_US; 336097754)',
        'Cookie': `sessionid=${REAL_SESSION_ID};`,
        'Accept-Language': 'en-US',
        'X-IG-App-ID': '936619743392459'
    };

    try {
        const response = await axios.get(apiUrl, { headers });
        const data = response.data;

        // ডেটা চেক করা (Mobile API Response)
        if (!data.items || data.items.length === 0) {
            throw new Error("No media found in Mobile API");
        }

        const item = data.items[0];
        let videoUrl = null;
        let imageUrl = null;

        // ভিডিও খোঁজা (Video Versions)
        if (item.video_versions && item.video_versions.length > 0) {
            videoUrl = item.video_versions[0].url; // সেরা কোয়ালিটি (Type 101)
            console.log("✅ Video found via Mobile API!");
        } 
        
        // ক্যারোসেল (একাধিক স্লাইড) হলে প্রথম ভিডিও নেওয়া
        else if (item.carousel_media) {
            const firstMedia = item.carousel_media[0];
            if (firstMedia.video_versions) {
                videoUrl = firstMedia.video_versions[0].url;
            } else {
                imageUrl = firstMedia.image_versions2.candidates[0].url;
            }
        }

        // ছবি বের করা (ব্যাকআপ)
        if (item.image_versions2 && item.image_versions2.candidates) {
            imageUrl = item.image_versions2.candidates[0].url;
        }

        // রেজাল্ট রিটার্ন
        if (videoUrl) {
            // লিংক ক্লিন করা (না করলেও চলে, তবু সেফটির জন্য)
            videoUrl = videoUrl.replace(/^http:/, 'https:'); 
            return { type: 'video', video: videoUrl, thumbnail: imageUrl || "" };
        } 
        else if (imageUrl) {
            return { type: 'photo', video: imageUrl, thumbnail: imageUrl };
        } 
        else {
            throw new Error("API returned no usable media.");
        }

    } catch (error) {
        console.error("❌ Mobile API Failed:", error.message);
        throw new Error("Failed to fetch from Instagram App API.");
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
                'User-Agent': 'Instagram 219.0.0.12.117 Android (28/9.0; 420dpi; 1080x1920; samsung; SM-G950F)' 
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
