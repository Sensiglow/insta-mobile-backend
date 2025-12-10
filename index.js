const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ১. CORS অনুমতি (সবাই এক্সেস পাবে)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ২. সার্ভার চেক করার রুট
app.get('/', (req, res) => {
    res.send('Instagram Stealth Server is Running! 🥷');
});

// ৩. মেইন ভিডিও ডাউনলোড ফাংশন (লাইব্রেরি ছাড়া)
async function instagramStealth(url) {
    console.log("🕸️ Scraping URL:", url);

    // আমরা ভান করব যে আমরা একটা মোবাইল ফোন
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.instagram.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1'
    };

    // Node.js এর নিজস্ব fetch ব্যবহার করা হচ্ছে
    const response = await fetch(url, { headers: headers });

    if (!response.ok) {
        throw new Error(`Instagram Blocked Request: ${response.status}`);
    }

    const html = await response.text();

    // HTML এর ভেতর থেকে ভিডিও এবং ছবি খোঁজা (Regex দিয়ে)
    const videoRegex = /<meta property="og:video" content="([^"]+)"/i;
    const imageRegex = /<meta property="og:image" content="([^"]+)"/i;
    const titleRegex = /<meta property="og:title" content="([^"]+)"/i;

    const videoMatch = html.match(videoRegex);
    const imageMatch = html.match(imageRegex);
    const titleMatch = html.match(titleRegex);

    if (videoMatch && videoMatch[1]) {
        // ভিডিও পাওয়া গেছে!
        // ভিডিও লিংক থেকে &amp; চিহ্নগুলো ঠিক করা
        const cleanVideoUrl = videoMatch[1].replace(/&amp;/g, '&');
        const cleanThumbUrl = imageMatch ? imageMatch[1].replace(/&amp;/g, '&') : '';
        
        return {
            video: cleanVideoUrl,
            thumbnail: cleanThumbUrl,
            title: titleMatch ? titleMatch[1] : 'Instagram Video'
        };
    } else if (imageMatch && imageMatch[1]) {
        // শুধু ছবি পাওয়া গেছে
        const cleanImageUrl = imageMatch[1].replace(/&amp;/g, '&');
        return {
            video: cleanImageUrl, // ফ্রন্টএন্ডে ভিডিও হিসেবেই পাঠাচ্ছি যাতে ডাউনলোড হয়
            thumbnail: cleanImageUrl,
            title: 'Instagram Photo'
        };
    } else {
        throw new Error("No media found in public page. Account might be private.");
    }
}

// ৪. API রুট
app.post('/download', async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
        const result = await instagramStealth(url);
        
        console.log("✅ Success! Media Found.");
        
        res.json({
            success: true,
            data: {
                video: result.video,
                thumbnail: result.thumbnail
            }
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        
        // যদি আইপি ব্লক থাকে, ইউজারকে মেসেজ দেওয়া
        if(error.message.includes("403")) {
             return res.status(403).json({ success: false, error: "Server IP Blocked by Instagram. Try again later." });
        }
        
        res.status(500).json({ success: false, error: "Download Failed: " + error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
