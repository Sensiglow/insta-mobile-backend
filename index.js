const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Running! Radhe Radhe! 🙏');
});

// ১. ভিডিও খোঁজার মেইন ফাংশন
async function getInstagramVideo(url) {
    console.log("🔍 Deep Search for:", url);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
    };

    const response = await fetch(url, { headers: headers });
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    
    const html = await response.text();

    // ভিডিও লিংক খোঁজার ৩টি ধাপ
    let videoUrl = null;

    // ধাপ ১: সরাসরি JSON এর ভেতর video_url খোঁজা (Reels এর জন্য সেরা)
    const jsonMatch = html.match(/"video_url":"([^"]+)"/);
    if (jsonMatch && jsonMatch[1]) {
        console.log("✅ JSON video_url found!");
        videoUrl = jsonMatch[1];
    }

    // ধাপ ২: যদি না পাওয়া যায়, মেটা ট্যাগ খোঁজা
    if (!videoUrl) {
        const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
        if (metaMatch && metaMatch[1]) {
            console.log("✅ Meta og:video found!");
            videoUrl = metaMatch[1];
        }
    }

    // ধাপ ৩: যদি তাও না পাওয়া যায়, .mp4 লিংক খোঁজা
    if (!videoUrl) {
        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
        if (mp4Match && mp4Match[0]) {
            console.log("✅ Direct .mp4 found!");
            videoUrl = mp4Match[0];
        }
    }

    // ছবি খোঁজা (Thumbnail)
    let imageUrl = "";
    const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    if (imgMatch && imgMatch[1]) imageUrl = imgMatch[1];

    if (videoUrl) {
        // লিংক ক্লিন করা (Unicode fix)
        videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
        imageUrl = imageUrl ? imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&') : "";
        
        return { type: 'video', url: videoUrl, thumb: imageUrl };
    } else if (imageUrl) {
        // ভিডিও না পেলে ছবি রিটার্ন করবে
        imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
        return { type: 'photo', url: imageUrl, thumb: imageUrl };
    } else {
        throw new Error("No media found!");
    }
}

// ২. ডাউনলোড API
app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getInstagramVideo(url);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch media." });
    }
});

// ৩. ডাইরেক্ট ডাউনলোড স্ট্রিম (Native Fetch দিয়ে, Axios লাগবে না)
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("File fetch failed");

        // ভিডিও হিসেবে ব্রাউজারে পাঠানো
        res.setHeader('Content-Disposition', `attachment; filename="insta_video_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        // ভিডিও স্ট্রিম পাইপ করা (Node 18+ Feature)
        const { Readable } = require('stream');
        // @ts-ignore
        Readable.fromWeb(response.body).pipe(res);

    } catch (error) {
        res.status(500).send("Error downloading file");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
