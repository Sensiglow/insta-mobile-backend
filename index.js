const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Fixed Server Running! Radhe Radhe! 🙏');
});

// সার্ভার লিস্ট
const API_SERVERS = [
    'https://cobalt.zuu.pl/api/json',
    'https://api.cobalt.tools/api/json',
    'https://cobalt.lacus.icu/api/json',
    'https://api.wuk.sh/api/json'
];

async function getVideo(url) {
    for (const server of API_SERVERS) {
        console.log(`🚀 Trying server: ${server}`);
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
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Origin': 'https://cobalt.tools',
                    'Referer': 'https://cobalt.tools/'
                },
                timeout: 10000
            });

            const data = response.data;

            // ১. যদি সরাসরি ভিডিও দেয় (Stream/Redirect)
            if (data.status === 'stream' || data.status === 'redirect') {
                return { type: 'video', video: data.url, thumbnail: "" };
            } 
            // ২. যদি পিকার (Picker) দেয় - এখানেই আসল ফিক্স
            else if (data.status === 'picker') {
                let videoLink = null;
                let imageLink = null;

                // লুপ চালিয়ে ভিডিও খোঁজা
                data.picker.forEach(item => {
                    if (item.type === 'video') videoLink = item.url;
                    if (item.type === 'photo') imageLink = item.url;
                });

                // ভিডিও পেলে ভিডিও, না হলে ছবি
                if (videoLink) {
                    return { type: 'video', video: videoLink, thumbnail: data.picker[0].thumb || "" };
                } else if (imageLink) {
                    return { type: 'photo', video: imageLink, thumbnail: imageLink };
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
                type: result.type // ভিডিও না ফটো সেটা ফ্রন্টএন্ডকে বলে দিচ্ছি
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: "Server Busy. Try again." });
    }
});

// ডাইরেক্ট ডাউনলোড স্ট্রিম (ফাইল সেভ করার জন্য)
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    const type = req.query.type || 'video';
    
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });

        // ফাইলের নাম ও টাইপ সেট করা
        const ext = type === 'photo' ? 'jpg' : 'mp4';
        const contentType = type === 'photo' ? 'image/jpeg' : 'video/mp4';

        res.setHeader('Content-Disposition', `attachment; filename="instasaver_${Date.now()}.${ext}"`);
        res.setHeader('Content-Type', contentType);
        
        response.data.pipe(res);

    } catch (error) {
        res.status(500).send("Error downloading file");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
