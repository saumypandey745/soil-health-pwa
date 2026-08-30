// Sarvam AI ka wrapper. Real API key hone par Sarvam TTS call karega.
// Key na hone par (abhi ka case) browser ki built-in SpeechSynthesis se fallback karega,
// taaki feature demo/test ke liye kaam kare bina key ke bhi.

const LANG_TO_SARVAM_CODE = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

const LANG_TO_BROWSER_LOCALE = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

export async function speakText(text, lang = 'en') {
  const sarvamKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY;

  if (sarvamKey) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target_language_code: LANG_TO_SARVAM_CODE[lang] || 'en-IN' }),
      });
      if (!res.ok) throw new Error('Sarvam TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      return;
    } catch (err) {
      console.warn('Sarvam AI TTS error, falling back to browser speech:', err);
      // niche fallback pe chala jayega
    }
  }

  // Fallback: browser SpeechSynthesis API (no key needed, works offline on-device)
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_TO_BROWSER_LOCALE[lang] || 'en-IN';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
}
