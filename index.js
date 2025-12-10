const express = require('express');
const cors = require('cors');
const instagramGetUrl = require("instagram-url-direct");

const app = express();
const PORT = process.env.PORT || 3000;

// ১. খুব শক্তিশালী CORS সেটআপ (যাতে কানেকশন কেউ না আটকায়)
app.use(cors({
    origin: '*', // সবাইকে অনুমতি দিলাম
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// ২. সার্ভার বেঁচে আছে কিনা চেক করার রুট
app.get('/', (req, res) => {
    res.send('Server is SUPER LIVE!');
});

// ৩. ডাউনলোড রুট (লগ সহ)
app.post('/download', async (req, res) => {
    console.log("🔴 RENDER LOG: Request এসেছে!"); // রিকোয়েস্ট আসলে এটা দেখাবে
    
    const { url } = req.body;
    console.log("User URL দিয়েছে:", url);

    if (!url) {
        console.log("ভুল: URL নেই");
        return res.status(400).json({ error: "URL is required" });
    }

    try {
        console.log("Instagram থেকে ডেটা আনার চেষ্টা চলছে...");
        const links = await instagramGetUrl(url);
        
        console.log("✅ সফল! ডেটা পাওয়া গেছে।");
        
        if (links.url_list.length > 0) {
            res.json({
                success: true,
                data: {
                    video: links.url_list[0],
                    thumbnail: links.media_details.thumbnail || ""
                }
            });
        } else {
            console.log("❌ ডেটা ফাঁকা এসেছে।");
            res.status(404).json({ success: false, error: "Video not found/Private" });
        }

    } catch (error) {
        console.error("❌ মারাত্মক এরর:", error); // আসল সমস্যা এখানে দেখা যাবে
        res.status(500).json({ success: false, error: "Internal Error: " + error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
