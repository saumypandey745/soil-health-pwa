import { useState } from 'react';
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
  }

  return (
    <div className="container">
      <div className="lang-switch">
        <button onClick={() => switchLang('en')}>EN</button>
        <button onClick={() => switchLang('hi')}>हिं</button>
        <button onClick={() => switchLang('kn')}>ಕನ್ನಡ</button>
      </div>

      <h1>{t('appTitle')}</h1>

      {step === 'capture' && (
        <>
          <PhotoCapture onCapture={handlePhoto} />
          <button className="btn btn-primary" disabled={!photo} onClick={() => setStep('form')}>
            {t('next')}
          </button>
        </>
      )}

      {step === 'form' && (
        <>
          <SoilForm onSubmit={handleFormSubmit} />
          <button className="btn btn-secondary" onClick={() => setStep('capture')}>{t('back')}</button>
        </>
      )}

      {step === 'results' && result && (
        <>
          <ResultsCard result={result} inputs={inputs} photo={photo} lang={router.locale} />
          <button className="btn btn-secondary" onClick={startOver}>{t('startOver')}</button>
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
