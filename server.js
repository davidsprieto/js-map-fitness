const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 8080;

// Use environment variable for the secret key
const secretKey = process.env.SECRET_KEY;

// Middleware
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self';");
    next();
});
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
            imgSrc: ["'self'", "data:", "https://api.mapbox.com", "https://api.tiles.mapbox.com", "https://tile.openstreetmap.org", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
        },
    })
);
app.use(express.json());
app.use(express.static('public'));


// Encrypt Data
app.post('/encrypt', (req, res) => {
    const {data} = req.body;
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    res.send({encrypted});
});

// Decrypt Data
app.post('/decrypt', (req, res) => {
    const {encryptedData} = req.body;
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedData, 'utf8', 'hex');
    decrypted += decipher.final('hex');
    res.send({decrypted});
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
