require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API proxy endpoint — keeps API key server-side
app.post('/api/analyze', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  const apiBase = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
  const modelName = process.env.MODEL_NAME || 'gpt-4o';

  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server.' });
  }

  const { imageBase64, endpoint, model, maxTokens, temperature } = req.body;

  const targetEndpoint = endpoint || apiBase;
  const targetModel = model || modelName;

  const payload = {
    model: targetModel,
    max_tokens: maxTokens || 512,
    temperature: temperature !== undefined ? temperature : 0.1,
    messages: [
      {
        role: 'system',
        content: `You are a fashion analyst AI. When given an image of a clothing item, you respond ONLY with a valid JSON object and nothing else. Do not include markdown code fences, commentary, or explanations. Respond with this exact schema:

{
  "garment_type": string,
  "primary_color": string,
  "secondary_color": string or null,
  "fit": string,
  "material": string,
  "pattern": string,
  "occasion": string,
  "sleeve_length": string or null,
  "confidence_score": float between 0 and 1
}

Allowed values:
- garment_type: T-Shirt, Shirt, Blouse, Sweater, Jacket, Coat, Dress, Skirt, Pants, Jeans, Shorts, Suit, Activewear, Outerwear, Other
- fit: Slim, Regular, Relaxed, Oversized, Fitted, Cropped, Tailored
- pattern: Solid, Striped, Plaid, Floral, Geometric, Animal Print, Graphic, Houndstooth, Other
- occasion: Casual, Business Casual, Formal, Athletic, Lounge, Outdoor, Smart Casual
- sleeve_length: Sleeveless, Short Sleeve, 3/4 Sleeve, Long Sleeve, N/A, or null

Use the allowed enum values provided. If you cannot determine a field with reasonable confidence, use the closest matching enum value and lower the confidence_score accordingly.`
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this clothing item and return the JSON schema.' },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ]
      }
    ]
  };

  try {
    const { default: fetch } = await import('node-fetch');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${targetEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out after 30 seconds.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: process.env.MODEL_NAME || 'gpt-4o' });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Wardrobe Analyzer running at http://localhost:${PORT}`);
});
