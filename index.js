const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Running! Radhe Radhe! 🙏');
});

// ভিডিও খোঁজার জাদুকরী ফাংশন (Embed Method)
async function getInstagramVideo(url) {
    console.log("🔍 Trying Embed Method for:", url);

    // ১. লিংকের শেষে /embed/captioned যোগ করা (এটি ব্লক এড়াতে সাহায্য করে)
    // লিংক ক্লিন করা (query params বাদ দেওয়া)
    const cleanUrl = url.split('?')[0].replace(/\/$/, '');
    const embedUrl = `${cleanUrl}/embed/captioned`;

    console.log("🔗 Fetching:", embedUrl);

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    try {
        const response = await fetch(embedUrl, { headers });
        if (!response.ok) throw new Error("Embed Page Blocked");

        const html = await response.text();

        // ২. ভিডিও লিংক খোঁজা (mp4)
        // Embed পেজে ভিডিও লিংকটি video_url এর মধ্যে থাকে
        let videoUrl = null;
        
        // Regex দিয়ে video_url বের করা
        const videoMatch = html.match(/"video_url":"([^"]+)"/);
        if (videoMatch && videoMatch[1]) {
            videoUrl = videoMatch[1].replace(/\\u0026/g, '&');
        } 
        // যদি ওভাবে না পায়, সরাসরি .mp4 খুঁজবে
        else {
            const mp4Match = html.match(/src="([^"]+\.mp4[^"]*)"/);
            if (mp4Match && mp4Match[1]) {
                videoUrl = mp4Match[1].replace(/&amp;/g, '&');
            }
        }

        // ৩. ছবি খোঁজা (Thumbnail)
        let imageUrl = "";
        const imgMatch = html.match(/"poster_url":"([^"]+)"/);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1].replace(/\\u0026/g, '&');
        }

        if (videoUrl) {
            console.log("✅ Video Found via Embed!");
            return { type: 'video', url: videoUrl, thumb: imageUrl };
        } else {
            throw new Error("No video found in embed data");
        }

    } catch (error) {
        console.log("❌ Embed method failed:", error.message);
        throw new Error("Could not fetch video. Instagram is restricting access.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getInstagramVideo(url);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, error: "Video not found or Private" });
    }
});

// স্ট্রিম ফাংশন (ডাইরেক্ট ডাউনলোডের জন্য)
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("File fetch failed");

        res.setHeader('Content-Disposition', `attachment; filename="insta_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        const { Readable } = require('stream');
        // @ts-ignore
        Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
        res.status(500).send("Error downloading file");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
