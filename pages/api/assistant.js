import { generateAgronomyAdvice } from '../../lib/assistantEngine';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { message, context, lang } = body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A valid message string is required' });
  }

  const cleanMessage = message.trim();
  if (cleanMessage.length > 500) {
    return res.status(400).json({ error: 'Message exceeds maximum allowed length of 500 characters' });
  }

  if (context !== undefined && (context === null || typeof context !== 'object' || Array.isArray(context))) {
    return res.status(400).json({ error: 'Invalid context object' });
  }

  const safeLang = typeof lang === 'string' && ['hi', 'kn', 'en'].includes(lang) ? lang : 'en';
  const safeContext = context && typeof context === 'object' ? context : {};

  // Check if an external LLM key is configured (e.g. GEMINI_API_KEY)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const promptText = `You are a respectful, practical Indian agricultural expert assistant helping a smallholder farmer.
You only give advice based strictly on the provided soil test data and farm context:
SOIL DATA: ${JSON.stringify(safeContext.soil || {})}
FARM CONTEXT: ${JSON.stringify(safeContext.farm || {})}
TOP CROPS: ${JSON.stringify((safeContext.recommendations || []).slice(0, 3))}

SAFETY RULES:
1. Do not invent soil numbers or weather forecasts.
2. Do not give universal or specific chemical fertilizer/pesticide dosage (e.g. never say "apply 50 kg urea"). Always advise the farmer to check their official Soil Health Card or local KVK for dosage.
3. Respond in language: ${safeLang === 'hi' ? 'Hindi (clean, natural)' : safeLang === 'kn' ? 'Kannada' : 'English'}.
4. Keep the answer concise (under 80 words), empathetic, and farmer-friendly.

FARMER QUESTION: "${cleanMessage}"`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.2 },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && typeof text === 'string') {
          return res.status(200).json({ reply: text.trim(), provider: 'ai' });
        }
      }
    } catch {
      // Fall through to deterministic expert engine on upstream failure
    }
  }

  // Deterministic Agronomy Reasoning Engine (offline & default provider)
  const reply = generateAgronomyAdvice({
    message: cleanMessage,
    context: safeContext,
    lang: safeLang,
  });

  return res.status(200).json({ reply, provider: 'expert_engine' });
}
