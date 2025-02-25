const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

// Environment Variables
const PORT = process.env.PORT || 8080;
const secretKey = process.env.SECRET_KEY || "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
const MAP_BOX_KEY = process.env.MAP_BOX_KEY;

require('dotenv').config();

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});

// Retrieve Map Box API Key
app.get('/config', (req, res) => {
    res.json({ mapBoxKey: MAP_BOX_KEY });
});

// Rate limiter
app.use(limiter);

// Optional: Custom CSP Header Middleware
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self';");
    next();
});

// Helmet Content Security Policy Middleware
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
            styleSrc: ["'self'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://unpkg.com", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
            imgSrc: ["'self'", "data:", "https://api.mapbox.com", "https://api.tiles.mapbox.com", "https://tile.openstreetmap.org", "https://cdnjs.cloudflare.com", "https://unpkg.com"],
            connectSrc: ["'self'", "https://api.mapbox.com", "https://api.tiles.mapbox.com"],
        },
    })
);

// Parse JSON request bodies
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Encrypt data endpoint
app.post('/encrypt', (req, res) => {
    try {
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ error: 'No data provided' });
        }

        // Log the incoming data for debugging
        // console.log('Encrypting data:', data);

        const keyBuffer = Buffer.from(secretKey, 'hex');
        const iv = crypto.randomBytes(16); // Generate a random IV
        const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Send IV along with encrypted data
        res.json({
            encrypted,
            iv: iv.toString('hex') // Send IV as hex string
        });
    } catch (error) {
        console.error('Encryption error:', error);
        res.status(500).json({ error: 'Encryption error' });
    }
});


// Decrypt Data endpoint
app.post('/decrypt', (req, res) => {
    try {
        const { encryptedData, iv } = req.body;

        // Log the incoming data for debugging
        // console.log('Decrypting data:', { encryptedData, iv });

        if (!encryptedData || !iv) {
            return res.status(400).json({ error: 'No encrypted data or IV provided' });
        }

        const keyBuffer = Buffer.from(secretKey, 'hex');
        const ivBuffer = Buffer.from(iv, 'hex'); // Convert IV back to buffer
        const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);

        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        res.json({ decrypted });
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).json({ error: 'Decryption error' });
    }
});

// App listen on specified port
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
