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

// ভিডিও আনার ফাংশন (Publer API ব্যবহার করে)
async function getInstagramData(url) {
    console.log("🚀 Requesting via Publer (Bypass Logic):", url);

    try {
        // ১. Publer API তে রিকোয়েস্ট পাঠানো (এরা ইনস্টাগ্রাম ব্লক খায় না)
        const response = await axios.post('https://app.publer.io/hooks/media', {
            url: url,
            iphone: false
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://publer.io/',
                'Origin': 'https://publer.io',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const data = response.data;

        // ২. ডেটা চেক করা
        if (data.payload && data.payload.length > 0) {
            const media = data.payload[0];
            
            console.log("✅ Success! Video found via Publer.");
            
            // ভিডিও না ছবি চেক করা
            if (media.type === 'video' || media.path.includes('.mp4')) {
                return { 
                    type: 'video', 
                    video: media.path, 
                    thumbnail: media.thumbnail 
                };
            } else {
                return { 
                    type: 'photo', 
                    video: media.path, 
                    thumbnail: media.path 
                };
            }
        } else {
            throw new Error("Publer could not fetch data.");
        }

    } catch (error) {
        console.error("❌ Publer Failed, trying Backup (Cobalt)...");
        // যদি Publer ফেইল করে, তখন Cobalt ট্রাই করবে
        return await getFromCobalt(url);
    }
}

// ব্যাকআপ ফাংশন (Cobalt)
async function getFromCobalt(url) {
    const backupServer = 'https://api.wuk.sh/api/json';
    try {
        const response = await axios.post(backupServer, {
            url: url,
            vCodec: "h264",
            vQuality: "720",
            isAudioOnly: false
        }, {
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });

        const data = response.data;
        if (data.status === 'stream' || data.status === 'redirect') {
            console.log("✅ Success from Cobalt Backup!");
            return { type: 'video', video: data.url, thumbnail: "" };
        } else if (data.status === 'picker') {
             return { type: 'video', video: data.picker[0].url, thumbnail: "" };
        }
        throw new Error("Backup failed too.");
    } catch (e) {
        throw new Error("All methods failed. Instagram is highly strict today.");
    }
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
        res.status(500).json({ success: false, error: "Server Busy. Try again later." });
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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://instagram.com'
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
