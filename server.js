import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => res.redirect('/index.html'));

// Proxy to Anthropic API (avoids CORS - API key never exposed to browser in direct call)
app.post('/api/chat', async (req, res) => {
  const { apiKey, body } = req.body;
  if (!apiKey || !body) {
    return res.status(400).json({ error: { message: 'apiKey and body required' } });
  }
  try {
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
