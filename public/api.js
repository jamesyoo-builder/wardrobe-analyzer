/**
 * api.js — AI API client and prompt construction
 */

const API = (() => {
  const SYSTEM_PROMPT = `You are a fashion analyst AI. When given an image of a clothing item, you respond ONLY with a valid JSON object and nothing else. Do not include markdown code fences, commentary, or explanations. Respond with this exact schema:

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

Use the allowed enum values provided. If you cannot determine a field with reasonable confidence, use the closest matching enum value and lower the confidence_score accordingly.`;

  function getSettings() {
    return {
      endpoint: sessionStorage.getItem('api_endpoint') || '/api',
      apiKey: sessionStorage.getItem('api_key') || '',
      model: sessionStorage.getItem('api_model') || 'gpt-4o',
      maxTokens: parseInt(sessionStorage.getItem('api_max_tokens') || '512', 10),
      temperature: parseFloat(sessionStorage.getItem('api_temperature') || '0.1'),
    };
  }

  function saveSettings(settings) {
    if (settings.endpoint !== undefined) sessionStorage.setItem('api_endpoint', settings.endpoint);
    if (settings.apiKey !== undefined) sessionStorage.setItem('api_key', settings.apiKey);
    if (settings.model !== undefined) sessionStorage.setItem('api_model', settings.model);
    if (settings.maxTokens !== undefined) sessionStorage.setItem('api_max_tokens', settings.maxTokens);
    if (settings.temperature !== undefined) sessionStorage.setItem('api_temperature', settings.temperature);
  }

  function parseResponse(text) {
    // Strip markdown fences
    let cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
    const data = JSON.parse(cleaned);
    const fields = ['garment_type','primary_color','secondary_color','fit','material','pattern','occasion','sleeve_length','confidence_score'];
    const result = {};
    for (const f of fields) {
      result[f] = data[f] !== undefined ? data[f] : null;
    }
    return result;
  }

  async function analyze(imageBase64) {
    const settings = getSettings();
    const isProxy = settings.endpoint === '/api' || settings.endpoint === '';

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      let response;

      if (isProxy) {
        // Use server-side proxy (keeps API key server-side)
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            model: settings.model,
            maxTokens: settings.maxTokens,
            temperature: settings.temperature
          }),
          signal: controller.signal
        });
      } else {
        // Direct browser-to-API call (static deployment)
        const endpoint = settings.endpoint.replace(/\/$/, '');
        if (!endpoint.startsWith('https://')) {
          throw new Error('API endpoint must use HTTPS.');
        }
        const payload = {
          model: settings.model,
          max_tokens: settings.maxTokens,
          temperature: settings.temperature,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this clothing item and return the JSON schema.' },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ]
            }
          ]
        };
        response = await fetch(`${endpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      }

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        let errMsg;
        try { errMsg = JSON.parse(errText)?.error?.message || errText; } catch { errMsg = errText; }
        throw new Error(`API error ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model.');
      return parseResponse(content);

    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') throw new Error('Request timed out after 30 seconds.');
      throw err;
    }
  }

  async function testConnection() {
    const settings = getSettings();
    const isProxy = settings.endpoint === '/api' || settings.endpoint === '';

    if (isProxy) {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error('Server health check failed.');
      return await res.json();
    }

    const endpoint = settings.endpoint.replace(/\/$/, '');
    if (!endpoint.startsWith('https://')) throw new Error('Endpoint must use HTTPS.');
    const res = await fetch(`${endpoint}/models`, {
      headers: { 'Authorization': `Bearer ${settings.apiKey}` }
    });
    if (!res.ok) throw new Error(`Connection failed: HTTP ${res.status}`);
    return { status: 'ok' };
  }

  return { getSettings, saveSettings, analyze, testConnection };
})();
