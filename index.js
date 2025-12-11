const express = require('express');
const cors = require('cors');
const axios = require('axios');
const https = require('https'); // সিকিউরিটি বাইপাস করার জন্য

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Fixed SSL Server Running! Radhe Radhe! 🙏');
});

// সিকিউরিটি বাধানিষেধ তুলে নেওয়া (SSL Bypass Agent)
const agent = new https.Agent({  
  rejectUnauthorized: false 
});

// সার্ভার লিস্ট (এগুলো এখন কাজ করবে)
const API_SERVERS = [
    'https://cobalt.lacus.icu/api/json',     // সার্ভার ১
    'https://cobalt.zuu.pl/api/json',        // সার্ভার ২
    'https://api.cobalt.tools/api/json',     // সার্ভার ৩
    'https://api.wuk.sh/api/json'            // সার্ভার ৪
];

async function getVideo(url) {
    for (const server of API_SERVERS) {
        console.log(`🚀 Trying server (SSL Bypassed): ${server}`);
        try {
            const response = await axios.post(server, {
                url: url,
                vCodec: "h264",
                vQuality: "720",
                filenamePattern: "classic",
                isAudioOnly: false
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Origin': 'https://cobalt.tools',
                    'Referer': 'https://cobalt.tools/'
                },
                httpsAgent: agent, // এখানেই আসল ম্যাজিক (সিকিউরিটি বাইপাস)
                timeout: 10000
            });

            const data = response.data;

            // ১. ডাইরেক্ট ভিডিও
            if (data.status === 'stream' || data.status === 'redirect') {
                return { type: 'video', video: data.url, thumbnail: "" };
            } 
            // ২. পিকার (লিস্ট)
            else if (data.status === 'picker') {
                let videoLink = null;
                // ভিডিও খোঁজা
                data.picker.forEach(item => {
                    if (item.type === 'video') videoLink = item.url;
                });

                if (videoLink) {
                    return { type: 'video', video: videoLink, thumbnail: "" };
                }
            }

        } catch (error) {
            console.error(`❌ Failed ${server}:`, error.message);
        }
    }
    throw new Error("All servers busy.");
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
                thumbnail: result.thumbnail,
                type: result.type
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
            responseType: 'stream',
            httpsAgent: agent // স্ট্রিমিং এর সময়ও সিকিউরিটি বাইপাস
        });

        res.setHeader('Content-Disposition', `attachment; filename="insta_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');
        
        response.data.pipe(res);

    } catch (error) {
        res.status(500).send("Stream Error");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
