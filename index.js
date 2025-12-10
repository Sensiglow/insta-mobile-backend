const express = require('express');
const cors = require('cors');
// লাইব্রেরি ইম্পোর্ট করার নতুন নিয়ম
const instagramDl = require("instagram-url-direct");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is Fully Active!');
});

app.post('/download', async (req, res) => {
    const { url } = req.body;
    console.log("URL Received:", url);

    if (!url) {
        return res.status(400).json({ error: "URL is required" });
    }

    try {
        let links;

        // *** FIX: লাইব্রেরি চেক করে কল করা হচ্ছে ***
        if (typeof instagramDl === 'function') {
            links = await instagramDl(url);
        } else if (typeof instagramDl.default === 'function') {
            links = await instagramDl.default(url);
        } else {
            console.log("Library Import Format:", instagramDl); // ডিবাগিং এর জন্য
            throw new Error("Library function not found!");
        }

        console.log("Data Fetched Successfully!");

        if (links.url_list.length > 0) {
            res.json({
                success: true,
                data: {
                    video: links.url_list[0],
                    thumbnail: links.media_details.thumbnail || ""
                }
            });
        } else {
            res.status(404).json({ success: false, error: "Video not found/Private" });
        }

    } catch (error) {
        console.error("SERVER ERROR:", error);
        res.status(500).json({ success: false, error: "Server Error: " + error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
