// Sarvam AI client wrapper: saara API interaction server-side /api/tts ke through hota hai.
// Client-side me koi bhi API key expose nahi ki jaati hai (server-only key).

// Global references taaki pehle se chal rahe audio playback ko track aur cleanup kar sakein
let currentAudio = null;
let currentAudioUrl = null;

// Browser fallback ke liye language code to locale mapping
const LANG_TO_BROWSER_LOCALE = {
  en: 'en-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
};

// Pehle se chal rahe audio ya speech ko cancel/stop karne ke liye helper function
function cancelCurrentPlayback() {
  // 1. Agar koi HTML5 Audio already play ho raha hai, to use pause aur reset karo
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  // 2. Agar koi Object URL bana hua hai, to memory leak se bachne ke liye revoke karo
  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }

  // 3. Agar browser ka built-in SpeechSynthesis bol raha hai, to use cancel karo
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Text ko voice me convert karke play karta hai.
 * Pehle server endpoint /api/tts ko call karta hai; agar fail ho to browser SpeechSynthesis pe fallback karta hai.
 * @param {string} text - Jo text bolna hai
 * @param {string} lang - Language code ('en' | 'hi' | 'kn')
 */
export async function speakText(text, lang = 'en') {
  // Step 1: Naya speech start karne se pehle chal raha koi bhi audio ya speech cancel karo
  cancelCurrentPlayback();

  const fallbackLocale = LANG_TO_BROWSER_LOCALE[lang] || 'en-IN';

  try {
    // Step 2: Hamesha /api/tts endpoint pe POST request bhejo bina kisi client-side key ke
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, lang }),
    });

    // Step 3: Agar server response OK nahi hai (jaise key missing ya upstream error), fallback trigger karo
    if (!res.ok) {
      throw new Error(`TTS server responded with status: ${res.status}`);
    }

    // Step 4: Audio binary WAV blob receive karo aur Object URL create karo
    const blob = await res.blob();
    const audioUrl = URL.createObjectURL(blob);
    currentAudioUrl = audioUrl;

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    // Step 5: Audio playback end hone ya fail hone par Object URL revoke karo
    const cleanup = () => {
      URL.revokeObjectURL(audioUrl);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (currentAudioUrl === audioUrl) {
        currentAudioUrl = null;
      }
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    // Step 6: Audio play karo
    await audio.play();
    return;
  } catch (err) {
    // Step 7: Network error ya Sarvam unavailable hone par browser SpeechSynthesis pe degrade karo
    console.warn('Sarvam AI unavailable, falling back to browser SpeechSynthesis:', err);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = fallbackLocale;
      window.speechSynthesis.speak(utterance);
    }
  }
}
