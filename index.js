const express = require('express');
const cors = require('cors');
const axios = require('axios'); // নতুন পাওয়ারফুল লাইব্রেরি

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Live & Fixed! Radhe Radhe! 🙏');
});

// Cobalt API ডাকার স্পেশাল ফাংশন
async function getVideoFromCobalt(url) {
    console.log("🚀 Trying Cobalt for:", url);

    try {
        const response = await axios.post('https://api.cobalt.tools/api/json', {
            url: url
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Origin': 'https://cobalt.tools', // Cobalt কে ধোঁকা দেওয়ার জন্য
                'Referer': 'https://cobalt.tools/', // Cobalt কে ধোঁকা দেওয়ার জন্য
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const data = response.data;
        console.log("✅ Cobalt Status:", data.status);

        if (data.status === 'stream' || data.status === 'redirect') {
            return {
                video: data.url,
                thumbnail: "" 
            };
        } 
        else if (data.status === 'picker') {
            // যদি ক্যারোসেল হয় (একাধিক ভিডিও)
            return {
                video: data.picker[0].url,
                thumbnail: data.picker[0].thumb || ""
            };
        } 
        else {
            throw new Error("Cobalt returned error status");
        }

    } catch (error) {
        console.error("❌ Cobalt Failed:", error.message);
        throw new Error("Failed to fetch video.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getVideoFromCobalt(url);
        
        res.json({
            success: true,
            data: {
                video: result.video,
                thumbnail: result.thumbnail
            }
        });

    } catch (error) {
        // যদি Cobalt কাজ না করে, সার্ভার এরর দেখাবে
        res.status(500).json({ success: false, error: "Server Busy. Try again." });
    }
});

// ডাইরেক্ট ডাউনলোড স্ট্রিম (যদি লাগে)
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });

        res.setHeader('Content-Disposition', `attachment; filename="insta_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');
        response.data.pipe(res);

    } catch (error) {
        res.status(500).send("Stream Error");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
