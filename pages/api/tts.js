// Server-side route: real Sarvam AI key ko client se hide rakhta hai.
// Jab SARVAM_API_KEY set hoga, ye actual Sarvam TTS API ko call karega.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'SARVAM_API_KEY not configured on server' });
  }

  const { text, target_language_code } = req.body;

  try {
    // NOTE: Sarvam AI TTS endpoint/payload — confirm exact fields from Sarvam docs when key is available.
    const sarvamRes = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': apiKey,
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code,
        speaker: 'meera',
        model: 'bulbul:v1',
      }),
    });

    if (!sarvamRes.ok) {
      const errText = await sarvamRes.text();
      return res.status(502).json({ error: 'Sarvam AI request failed', details: errText });
    }

    const data = await sarvamRes.json();
    // Sarvam returns base64 audio in `audios[0]` per their docs
    const audioBase64 = data.audios?.[0];
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    res.setHeader('Content-Type', 'audio/wav');
    res.send(audioBuffer);
  } catch (err) {
    res.status(500).json({ error: 'TTS generation failed', details: err.message });
  }
}
