const express = require('express');
const crypto = require('crypto');
const helmet = require('helmet');
const app = express();
const PORT = process.env.PORT || 8080;

// Use environment variable for the secret key
const secretKey = process.env.SECRET_KEY;

// Middleware
app.use(express.json());
app.use(helmet());
app.use(express.static('public'));
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self';");
    next();
});


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
