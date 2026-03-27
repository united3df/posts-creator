import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => res.redirect('/index.html'));

// Proxy to Anthropic or Gemini API (avoids CORS)
app.post('/api/chat', async (req, res) => {
  const { provider = 'anthropic', apiKey, body } = req.body;
  if (!apiKey || !body) {
    return res.status(400).json({ error: { message: 'apiKey and body required' } });
  }
  try {
    if (provider === 'gemini') {
      const url =
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=' +
        encodeURIComponent(apiKey);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data.error?.message || `HTTP ${r.status}`;
        return res.status(r.status).json({ error: { message: msg } });
      }
      const parts = data.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((p) => p.text).filter(Boolean).join('\n')
        : '';
      if (!text) {
        const block = data.promptFeedback?.blockReason;
        return res.status(400).json({
          error: { message: block ? `Blocked: ${block}` : 'Empty response from Gemini' }
        });
      }
      return res.json({ content: [{ type: 'text', text }] });
    }

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    res.status(500).json({ error: { message: e.message } });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
