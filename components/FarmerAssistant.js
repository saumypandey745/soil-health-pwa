import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { generateAgronomyAdvice } from '../lib/assistantEngine';

export default function FarmerAssistant({ result, inputs, farmContext = {}, lang = 'en' }) {
  const { t } = useTranslation('common');

  const defaultGreeting = {
    hi: 'नमस्ते! मैं आपका एआई किसान सहायक हूँ। अपनी मिट्टी की जांच रिपोर्ट, पोषक तत्वों या फसल चुनाव के बारे में मुझसे कोई भी सवाल पूछें।',
    kn: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮ್ಮ AI ರೈತ ಸಹಾಯಕ. ನಿಮ್ಮ ಮಣ್ಣಿನ ವರದಿ, ಪೋಷಕಾಂಶಗಳು ಅಥವಾ ಬೆಳೆ ಆಯ್ಕೆಯ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.',
    en: 'Hello! I am your AI Farmer Assistant. Ask me any question about your soil test report, nutrient balance, or crop choices.',
  };

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: defaultGreeting[lang] || defaultGreeting.en,
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chatBottomRef = useRef(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const agronomyContext = {
    soil: {
      n: inputs?.n,
      p: inputs?.p,
      k: inputs?.k,
      ph: inputs?.ph,
      score: result?.score,
      grade: result?.soilClassification?.healthGrade,
      limitingFactor: result?.soilClassification?.limitingFactor,
    },
    farm: farmContext,
    recommendations: (result?.cropRecommendations || []).slice(0, 4),
  };

  async function handleSend(queryText) {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || loading) return;

    setErrorMsg('');
    setInputText('');

    const newMessages = [...messages, { sender: 'user', text: textToSend }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // If client is online, call secure server-side API route
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: textToSend,
            context: agronomyContext,
            lang,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMessages([...newMessages, { sender: 'bot', text: data.reply }]);
          setLoading(false);
          return;
        }
      }

      // Offline or network fallback: invoke deterministic local agronomy engine
      const localReply = generateAgronomyAdvice({
        message: textToSend,
        context: agronomyContext,
        lang,
      });

      setMessages([...newMessages, { sender: 'bot', text: localReply }]);
    } catch {
      // Local fallback on any network exception
      const fallbackReply = generateAgronomyAdvice({
        message: textToSend,
        context: agronomyContext,
        lang,
      });
      setMessages([...newMessages, { sender: 'bot', text: fallbackReply }]);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([
      {
        sender: 'bot',
        text: defaultGreeting[lang] || defaultGreeting.en,
      },
    ]);
    setErrorMsg('');
  }

  const suggestedQuestions = [
    { id: 'q1', text: t('suggestedQ1') },
    { id: 'q2', text: t('suggestedQ2') },
    { id: 'q3', text: t('suggestedQ3') },
    { id: 'q4', text: t('suggestedQ4') },
  ];

  return (
    <div className="card card-clean farmer-assistant-card" aria-label="AI Farmer Assistant">
      <div className="form-header-box assistant-header">
        <div className="assistant-title-row">
          <h3 className="section-title">🤖 {t('assistantTitle')}</h3>
          <button type="button" className="btn-link" onClick={handleClear} title={t('clearChat')}>
            🔄 {t('clearChat')}
          </button>
        </div>
        <p className="form-subtitle">{t('assistantSubtitle')}</p>
      </div>

      {/* Suggested Questions Chips */}
      <div className="suggested-chips-row">
        {suggestedQuestions.map((q) => (
          <button
            key={q.id}
            type="button"
            className="chip-btn"
            onClick={() => handleSend(q.text)}
            disabled={loading}
          >
            💬 {q.text}
          </button>
        ))}
      </div>

      {/* Chat Messages Area */}
      <div className="chat-messages-container" role="log" aria-live="polite">
        {messages.map((m, idx) => (
          <div key={idx} className={`chat-bubble-wrapper ${m.sender === 'user' ? 'user-wrapper' : 'bot-wrapper'}`}>
            <div className={`chat-bubble ${m.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-wrapper bot-wrapper">
            <div className="chat-bubble chat-bubble-bot loading-bubble">
              <span className="dot-pulse">●</span> {t('assistantThinking')}
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="chat-input-form"
      >
        <input
          type="text"
          className="chat-input"
          placeholder={t('askQuestionPlaceholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
          maxLength={500}
        />
        <button type="submit" className="btn btn-primary chat-send-btn" disabled={loading || !inputText.trim()}>
          {t('send')}
        </button>
      </form>

      {errorMsg && <p className="chat-error-msg">⚠️ {errorMsg}</p>}
    </div>
  );
}
