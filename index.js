const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Multi-Server System Running! Radhe Radhe! 🙏');
});

// বিভিন্ন সার্ভারের তালিকা (একটা না চললে অন্যটা চলবে)
const COBALT_INSTANCES = [
    'https://cobalt.zuu.pl/api/json',        // সার্ভার ১
    'https://api.cobalt.tools/api/json',     // সার্ভার ২ (অফিসিয়াল)
    'https://cobalt.lacus.icu/api/json',     // সার্ভার ৩
    'https://api.wuk.sh/api/json'            // সার্ভার ৪
];

async function getVideo(url) {
    let lastError = null;

    // লুপ চালিয়ে সব সার্ভার চেক করা
    for (const apiBase of COBALT_INSTANCES) {
        console.log(`🚀 Trying server: ${apiBase}`);

        try {
            const response = await axios.post(apiBase, {
                url: url,
                vCodec: "h264",
                vQuality: "720",
                filenamePattern: "classic",
                isAudioOnly: false
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://cobalt.tools',
                    'Referer': 'https://cobalt.tools/'
                },
                timeout: 10000 // ১০ সেকেন্ড অপেক্ষা করবে সর্বোচ্চ
            });

            const data = response.data;
            console.log(`✅ Success from ${apiBase}:`, data.status);

            if (data.status === 'stream' || data.status === 'redirect') {
                return { video: data.url, thumbnail: "" };
            } 
            else if (data.status === 'picker') {
                return { video: data.picker[0].url, thumbnail: data.picker[0].thumb || "" };
            }

        } catch (error) {
            console.error(`❌ Failed ${apiBase}:`, error.message);
            lastError = error;
            // লুপ কন্টিনিউ করবে পরের সার্ভারের জন্য
        }
    }

    // যদি সব সার্ভার ফেল করে
    throw new Error("All servers are busy. Please try again later.");
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
