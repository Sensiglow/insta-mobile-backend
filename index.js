const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Facebook Robot Server Running! Radhe Radhe! 🙏');
});

async function getInstagramData(url) {
    console.log("🔍 Facebook Robot Scanning:", url);

    // ১. আমরা সাজব ফেসবুকের রোবট (যাতে ব্লক না করে)
    const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    try {
        const response = await axios.get(url, { headers });
        const html = response.data;

        // ২. ভিডিও খোঁজার পালা (Deep Scan)
        let videoUrl = null;

        // পদ্ধতি ১: সরাসরি .mp4 লিংক খোঁজা (সবচেয়ে শক্তিশালী পদ্ধতি)
        // এই Regex টি পুরো HTML ঘেঁটে mp4 লিংক বের করবে
        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4[^"']*/g);
        
        if (mp4Match && mp4Match.length > 0) {
            // প্রথম লিংকটাই সাধারণত আসল ভিডিও হয়
            videoUrl = mp4Match[0];
            console.log("✅ Found .mp4 directly!");
        }

        // পদ্ধতি ২: যদি .mp4 না পায়, তখন video_url ট্যাগ খোঁজা
        if (!videoUrl) {
            const jsonMatch = html.match(/"video_url":"([^"]+)"/);
            if (jsonMatch && jsonMatch[1]) {
                videoUrl = jsonMatch[1];
            }
        }

        // পদ্ধতি ৩: মেটা ট্যাগ খোঁজা
        if (!videoUrl) {
            const metaMatch = html.match(/<meta property="og:video" content="([^"]+)"/i);
            if (metaMatch && metaMatch[1]) {
                videoUrl = metaMatch[1];
            }
        }

        // ৩. ছবি খোঁজা (থাম্বনেইল)
        let imageUrl = "";
        const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        if (imgMatch && imgMatch[1]) {
            imageUrl = imgMatch[1];
        }

        // ৪. রেজাল্ট তৈরি করা
        if (videoUrl) {
            // লিংক ক্লিন করা (Unicode \u0026 বা &amp; থাকলে ঠিক করা)
            videoUrl = videoUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            
            return { type: 'video', url: videoUrl, thumb: imageUrl };
        } 
        else if (imageUrl) {
            // ভিডিও না পেলে ছবি
            imageUrl = imageUrl.replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
            return { type: 'photo', url: imageUrl, thumb: imageUrl };
        } 
        else {
            throw new Error("No media found. Account might be Private.");
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        throw new Error("Failed to fetch. Instagram might be restricting.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const result = await getInstagramData(url);
        
        res.json({
            success: true,
            data: {
                video: result.url,
                thumbnail: result.thumb,
                type: result.type // ফ্রন্টএন্ড বুঝবে এটা ভিডিও না ছবি
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: "Server Busy or Private Video." });
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
