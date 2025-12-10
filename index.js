const express = require('express');
const cors = require('cors');
const instagramGetUrl = require("instagram-url-direct");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Mobile Backend Running!');
});

app.post('/download', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL Required" });

    try {
        const links = await instagramGetUrl(url);
        if (links.url_list.length > 0) {
            res.json({
                success: true,
                data: {
                    video: links.url_list[0],
                    thumbnail: links.media_details.thumbnail || ""
                }
            });
        } else {
            res.status(404).json({ success: false, error: "Not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Server Error" });
    }
});

app.listen(PORT, () => console.log(`Server running`));
