const LANG_MAP = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'SARVAM_API_KEY not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }
  body = body || {};

  const { text, lang } = body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty text' });
  }

  const languageCode = LANG_MAP[lang];
  if (!languageCode) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  const truncatedText = text.slice(0, 2500);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        text: truncatedText,
        language_code: languageCode,
        model: 'bulbul:v3',
        speaker: 'shubh',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!sarvamRes.ok) {
      return res.status(502).json({ error: 'Sarvam AI request failed' });
    }

    const data = await sarvamRes.json();
    const audios = data?.audios;
    if (!audios || !Array.isArray(audios) || audios.length === 0) {
      return res.status(502).json({ error: 'Sarvam AI request failed' });
    }

    const audioBuffer = Buffer.from(audios.join(''), 'base64');
    res.setHeader('Content-Type', 'audio/wav');
    return res.status(200).send(audioBuffer);
  } catch (err) {
    clearTimeout(timeoutId);
    return res.status(500).json({ error: 'TTS generation failed' });
  }
}
