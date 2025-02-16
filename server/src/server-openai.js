
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Function to read the OpenAI API key from a file
const apiKeyPath = path.join(__dirname, 'apiKey.txt');
let apiKey = '';

try {
    apiKey = fs.readFileSync(apiKeyPath, 'utf8').trim();
} catch (error) {
    console.error("Failed to read OpenAI API key:", error);
    process.exit(1);
}

// Proxy endpoint to OpenAI with streaming support
app.post('/proxy-openai', (req, res) => {
    const options = {
        hostname: 'api.openai.com',
        path: '/v1/your-endpoint', // Update with the correct endpoint path
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);

        // Pipe the data from the OpenAI response to the client
        proxyRes.pipe(res);
    });

    // Handle request errors
    proxyReq.on('error', (err) => {
        console.error('Request error:', err);
        res.status(500).send({ error: 'An error occurred while processing your request.' });
    });

    // Send the incoming request's JSON body to the OpenAI API
    req.pipe(proxyReq);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
