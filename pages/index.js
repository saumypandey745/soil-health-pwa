import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import PhotoCapture from '../components/PhotoCapture';
import SoilForm from '../components/SoilForm';
import ResultsCard from '../components/ResultsCard';
import { analyzeSoil } from '../lib/soilLogic';

export default function Home() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [step, setStep] = useState('capture'); // capture -> form -> results
  const [photo, setPhoto] = useState(null);
  const [inputs, setInputs] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load offline soil history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('soil_health_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Storage access fallback
    }
  }, []);

  function handlePhoto(dataUrl) {
    setPhoto(dataUrl);
  }

  function handleFormSubmit(values) {
    const parsed = {
      n: Number(values.n),
      p: Number(values.p),
      k: Number(values.k),
      ph: Number(values.ph),
    };
    setInputs(parsed);
    const analysis = analyzeSoil(parsed);
    setResult(analysis);

    // Save to local history
    try {
      const newEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        inputs: parsed,
        result: analysis,
        photoThumbnail: photo ? photo.slice(0, 100) : null,
      };
      const updated = [newEntry, ...history.filter((h) => h.id !== newEntry.id)].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('soil_health_history', JSON.stringify(updated));
    } catch {
      // Storage save fallback
    }

    setStep('results');
  }

  function switchLang(locale) {
    router.push(router.pathname, router.asPath, { locale });
  }

  function startOver() {
    setStep('capture');
    setPhoto(null);
    setInputs(null);
    setResult(null);
    setShowHistory(false);
  }

  function loadHistoryItem(item) {
    setInputs(item.inputs);
    setResult(item.result);
    setStep('results');
    setShowHistory(false);
  }

  function clearHistory() {
    try {
      localStorage.removeItem('soil_health_history');
      setHistory([]);
    } catch {
      // Storage clear fallback
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="header-top">
          <span className="logo-badge">🌱 AgriTech</span>
          <div className="lang-switch">
            <button
              className={router.locale === 'en' ? 'active-lang' : ''}
              onClick={() => switchLang('en')}
              aria-label="English"
            >
              EN
            </button>
            <button
              className={router.locale === 'hi' ? 'active-lang' : ''}
              onClick={() => switchLang('hi')}
              aria-label="Hindi"
            >
              हिं
            </button>
            <button
              className={router.locale === 'kn' ? 'active-lang' : ''}
              onClick={() => switchLang('kn')}
              aria-label="Kannada"
            >
              ಕನ್ನಡ
            </button>
          </div>
        </div>
        <h1 className="main-title">{t('appTitle')}</h1>
      </header>

      {/* History Drawer Modal / Section */}
      {showHistory && (
        <div className="history-modal card card-clean">
          <div className="history-header">
            <h3>📋 {t('historyTitle')}</h3>
            <button className="close-btn" onClick={() => setShowHistory(false)}>✕</button>
          </div>
          {history.length === 0 ? (
            <p className="no-history-text">{t('noHistory')}</p>
          ) : (
            <div className="history-list">
              {history.map((h) => (
                <div key={h.id} className="history-item" onClick={() => loadHistoryItem(h)}>
                  <div className="history-item-top">
                    <span className="history-date">
                      {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`status-pill pill-${h.result.overall}`}>
                      {h.result.score}/100 {h.result.soilClassification?.healthGrade ? `(${h.result.soilClassification.healthGrade})` : ''}
                    </span>
                  </div>
                  <div className="history-item-details">
                    N: {h.inputs.n} | P: {h.inputs.p} | K: {h.inputs.k} | pH: {h.inputs.ph}
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={clearHistory}>
                🗑️ {t('clearHistory')}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'capture' && !showHistory && (
        <>
          <PhotoCapture onCapture={handlePhoto} />
          <button className="btn btn-primary" disabled={!photo} onClick={() => setStep('form')}>
            {t('next')}
          </button>
          {history.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowHistory(true)}>
              📋 {t('viewHistory')} ({history.length})
            </button>
          )}
        </>
      )}

      {step === 'form' && (
        <>
          <SoilForm onSubmit={handleFormSubmit} />
          <button className="btn btn-secondary" onClick={() => setStep('capture')}>
            {t('back')}
          </button>
        </>
      )}

      {step === 'results' && result && (
        <>
          <ResultsCard result={result} inputs={inputs} photo={photo} lang={router.locale} />
          <button className="btn btn-secondary" onClick={startOver}>
            {t('startOver')}
          </button>
        </>
      )}
    </div>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
