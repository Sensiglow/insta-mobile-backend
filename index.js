const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Alternative Server Running! Radhe Radhe! 🙏');
});

// ভিডিও আনার ফাংশন (Alternative Server দিয়ে)
async function getVideo(url) {
    console.log("🚀 Trying Alternative Server for:", url);

    // আমরা মেইন সার্ভারের বদলে 'co.wuk.sh' ব্যবহার করছি
    const apiUrl = 'https://co.wuk.sh/api/json';

    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    const body = {
        url: url,
        vCodec: "h264",
        vQuality: "720",
        aFormat: "mp3",
        filenamePattern: "classic"
    };

    try {
        const response = await axios.post(apiUrl, body, { headers });
        const data = response.data;

        console.log("✅ API Status:", data.status);

        if (data.status === 'stream' || data.status === 'redirect') {
            return {
                video: data.url,
                thumbnail: "" 
            };
        } 
        else if (data.status === 'picker') {
            return {
                video: data.picker[0].url,
                thumbnail: data.picker[0].thumb || ""
            };
        } 
        else {
            throw new Error("API returned error");
        }

    } catch (error) {
        console.error("❌ Failed:", error.message);
        throw new Error("Failed to fetch video.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getVideo(url);
        
        res.json({
            success: true,
            data: {
                video: result.video,
                thumbnail: result.thumbnail
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: "Server Busy. Try again." });
    }
});

// ডাইরেক্ট ডাউনলোড স্ট্রিম
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
