// public/app.js
const BACKEND_URL = 'https://neartube.onrender.com';
const APP_SECRET = '__INJECT_APP_SECRET__';

// Helper function to generate SHA-256 HMAC signature in browser crypto
async function generateSignature(timestamp, bodyString, secret) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const signature = await crypto.subtle.sign(
        "HMAC", key, enc.encode(timestamp + bodyString)
    );
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('loadBtn').addEventListener('click', async () => {
    const rawInput = document.getElementById('videoUrlInput').value.trim();
    if (!rawInput) return;

    let videoId = rawInput;
    try {
        if (rawInput.includes('youtu.be/')) {
            videoId = rawInput.split('youtu.be/')[1].split('?')[0];
        } else if (rawInput.includes('watch?v=')) {
            videoId = rawInput.split('watch?v=')[1].split('&')[0];
        } else if (rawInput.includes('embed/')) {
            videoId = rawInput.split('embed/')[1].split('?')[0];
        }
    } catch (e) {
        videoId = rawInput; // Fallback if parsing fails
    }

    const playerContainer = document.getElementById('playerContainer');
    playerContainer.innerHTML = `<p class="placeholder-text">Securely requesting proxy channels...</p>`;

    try {
        const payload = JSON.stringify({ videoId });
        const timestamp = Date.now().toString();
        const signature = await generateSignature(timestamp, payload, APP_SECRET);

        console.log("Attempting secure fetch to:", `${BACKEND_URL}/api/resolve-video`);

        const response = await fetch(`${BACKEND_URL}/api/resolve-video`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-timestamp': timestamp,
                'x-signature': signature
            },
            body: payload
        });

        // Debug helper: Check if server returned HTML instead of JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const rawText = await response.text();
            throw new Error(`Server returned non-JSON response: ${rawText.substring(0, 100)}`);
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server validation failed');

        playerContainer.innerHTML = `
            <iframe src="${data.secureStreamConfig.playerEmbedUrl}" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>`;
    } catch (err) {
        playerContainer.innerHTML = `<p class="placeholder-text" style="color: #ff4444;">Error: ${err.message}</p>`;
    }
});
