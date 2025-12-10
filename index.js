const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Bypass Server is Running! Radhe Radhe! 🙏');
});

// Cobalt API ব্যবহার করে ভিডিও আনার ফাংশন
async function getVideoFromCobalt(url) {
    console.log("🚀 Sending request to Cobalt API for:", url);

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
        // আমরা Cobalt এর পাবলিক সার্ভার ব্যবহার করছি
        const response = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        const data = await response.json();

        console.log("✅ Cobalt Response:", data.status);

        if (data.status === 'stream' || data.status === 'redirect') {
            return {
                video: data.url,
                thumbnail: "" // Cobalt থাম্বনেইল দেয় না, তাই আমরা ভিডিও থেকেই থাম্বনেইল দেখাব ফ্রন্টএন্ডে
            };
        } 
        else if (data.status === 'picker') {
            // যদি একাধিক ভিডিও থাকে (Carousel)
            return {
                video: data.picker[0].url,
                thumbnail: data.picker[0].thumb || ""
            };
        } 
        else {
            throw new Error("Download failed via API");
        }

    } catch (error) {
        console.error("❌ API Error:", error.message);
        throw new Error("Failed to fetch video. Try again.");
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
                thumbnail: result.thumbnail // ভিডিও লোড না হলে ডিফল্ট আইকন দেখাবে
            }
        });

    } catch (error) {
        console.error("❌ Final Error:", error.message);
        res.status(500).json({ success: false, error: "Server Busy. Please try again." });
    }
});

// ডাইরেক্ট ডাউনলোড স্ট্রিম
app.get('/stream', async (req, res) => {
    const fileUrl = req.query.url;
    if (!fileUrl) return res.status(400).send("No URL");

    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("File fetch failed");

        res.setHeader('Content-Disposition', `attachment; filename="insta_${Date.now()}.mp4"`);
        res.setHeader('Content-Type', 'video/mp4');

        const { Readable } = require('stream');
        // @ts-ignore
        Readable.fromWeb(response.body).pipe(res);
    } catch (error) {
        res.status(500).send("Error downloading file");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
