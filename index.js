const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Master Bypass Server Running! Radhe Radhe! 🙏');
});

// বিভিন্ন এপিআই সোর্স (একটা না চললে অন্যটা চলবে)
async function getInstagramData(url) {
    console.log("🚀 Processing URL:", url);

    // ১. চেষ্টা: Publer API (খুবই শক্তিশালী এবং ফ্রি)
    try {
        console.log("👉 Trying Method 1 (Publer)...");
        const response = await axios.post('https://app.publer.io/hooks/media', {
            url: url,
            iphone: false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://publer.io/',
                'Origin': 'https://publer.io'
            }
        });

        const data = response.data;
        if (data.payload && data.payload.length > 0) {
            console.log("✅ Success from Publer!");
            return {
                video: data.payload[0].path, // ভিডিও লিংক
                thumbnail: data.payload[0].thumbnail,
                type: 'video'
            };
        }
    } catch (e) {
        console.log("❌ Method 1 Failed, trying next...");
    }

    // ২. চেষ্টা: Cobalt (Backup)
    try {
        console.log("👉 Trying Method 2 (Cobalt Backup)...");
        const response = await axios.post('https://api.cobalt.tools/api/json', {
            url: url
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Origin': 'https://cobalt.tools',
                'Referer': 'https://cobalt.tools/'
            }
        });

        if (response.data.status === 'stream' || response.data.status === 'redirect') {
            console.log("✅ Success from Cobalt!");
            return {
                video: response.data.url,
                thumbnail: "",
                type: 'video'
            };
        }
    } catch (e) {
        console.log("❌ Method 2 Failed.");
    }

    throw new Error("All methods failed. Instagram is too strict today.");
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
        console.error("Critical Fail:", error.message);
        res.status(500).json({ success: false, error: "Server Busy. Please try again later." });
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
