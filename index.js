const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ১. CORS (সবার জন্য উন্মুক্ত)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Radhe Radhe! Server is Running! 🙏');
});

// ২. ভিডিও বের করার শক্তিশালী ফাংশন
async function getInstagramVideo(url) {
    console.log("🔍 Searching Video for:", url);

    // কৌশল: আমরা সাজব "Facebook Crawler" (যাতে ইনস্টাগ্রাম ব্লক না করে)
    const headers = {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
    };

    const response = await fetch(url, { headers: headers });

    if (!response.ok) {
        throw new Error(`Instagram blocked us: ${response.status}`);
    }

    const html = await response.text();

    // ভিডিও খোঁজার জন্য ৩টি ভিন্ন উপায় (Regex)
    const videoRegex1 = /<meta property="og:video" content="([^"]+)"/i;
    const videoRegex2 = /"video_url":"([^"]+)"/;
    const videoRegex3 = /"contentUrl":"([^"]+)"/;
    
    // ছবির জন্য
    const imageRegex = /<meta property="og:image" content="([^"]+)"/i;

    // এক এক করে চেক করা
    let videoUrl = null;
    let match = html.match(videoRegex1) || html.match(videoRegex2) || html.match(videoRegex3);

    if (match && match[1]) {
        // ভিডিও পাওয়া গেছে! &amp; চিহ্নগুলো ঠিক করা হচ্ছে
        videoUrl = match[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    }

    // ছবি বের করা
    let imageUrl = "";
    const imgMatch = html.match(imageRegex);
    if (imgMatch && imgMatch[1]) {
        imageUrl = imgMatch[1].replace(/\\u0026/g, '&').replace(/&amp;/g, '&');
    }

    // রেজাল্ট রিটার্ন করা
    if (videoUrl) {
        return { type: 'video', url: videoUrl, thumb: imageUrl };
    } else if (imageUrl) {
        return { type: 'photo', url: imageUrl, thumb: imageUrl };
    } else {
        throw new Error("Nothing found! Account might be private.");
    }
}

app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const result = await getInstagramVideo(url);
        
        console.log("✅ Found Type:", result.type);
        
        res.json({
            success: true,
            data: {
                video: result.url, // এটাই ভিডিও লিংক
                thumbnail: result.thumb
            }
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ success: false, error: "Download Failed: " + error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
