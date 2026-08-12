const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

// Load secret keys from Render Environment Variables
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://your-github-username.github.io';
const APP_SECRET = process.env.APP_SECRET || 'super-secure-backend-shared-key-change-me';

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests from your GitHub Pages domain or local dev testing
        if (!origin || origin === ALLOWED_ORIGIN || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('Blocked by CORS: Unauthorized App Origin'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Security Middleware: Verifies cryptographic hash signature from your PWA frontend
app.use('/api/', (req, res, next) => {
    const clientSignature = req.headers['x-signature'];
    const timestamp = req.headers['x-timestamp'];

    if (!clientSignature || !timestamp) {
        return res.status(403).json({ error: 'Forbidden: Missing security headers' });
    }

    // Prevent replay attacks: Reject requests older than 3 minutes
    const now = Date.now();
    if (Math.abs(now - parseInt(timestamp)) > 180000) {
        return res.status(403).json({ error: 'Forbidden: Request expired' });
    }

    // Compute expected server-side signature
    const hmac = crypto.createHmac('sha256', APP_SECRET);
    hmac.update(timestamp + JSON.stringify(req.body || {}));
    const expectedSignature = hmac.digest('hex');

    if (clientSignature !== expectedSignature) {
        return res.status(403).json({ error: 'Forbidden: Invalid cryptographic signature' });
    }

    next();
});

// Protected API Route to handle video payload/metadata securely
app.post('/api/resolve-video', async (req, res) => {
    try {
        const { videoId } = req.body;
        if (!videoId) {
            return res.status(400).json({ error: 'Video ID is required' });
        }

        // Here you can securely process info or call external tools away from public eyes
        // Returning lightweight structural configuration for your PWA player
        return res.json({
            success: true,
            secureStreamConfig: {
                id: videoId,
                playerEmbedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`,
                proxyLoadedAt: new Date().toISOString()
            }
        });
    } catch (err) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Secure backend running on port ${PORT}`));
