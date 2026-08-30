import { useTranslation } from 'next-i18next';
import { speakText } from '../lib/sarvam';
import { generateSoilReport } from '../lib/pdfReport';

const CARD_CLASS = { healthy: 'card-green', moderate: 'card-yellow', severe: 'card-red' };
const STATUS_KEY = { healthy: 'healthy', moderate: 'moderateDeficiency', severe: 'severeDeficiency' };

export default function ResultsCard({ result, inputs, photo, lang }) {
  const { t } = useTranslation('common');

  function handleListen() {
    const summary = `${t('soilHealthScore')}: ${result.score} out of 100. ${t('deficiencyDiagnosis')}: ${
      result.deficiencies.length ? result.deficiencies.map((d) => `${d.nutrient} ${d.status}`).join(', ') : t('healthy')
    }. ${t('recommendedCrops')}: ${result.recommendedCrops.join(', ')}.`;
    speakText(summary, lang);
  }

  function handleDownload() {
    generateSoilReport({ inputs, result, photoDataUrl: photo });
  }

  return (
    <div>
      <div className={`card ${CARD_CLASS[result.overall]}`}>
        <strong>{t('soilHealthScore')}:</strong> {result.score}/100 ({t(STATUS_KEY[result.overall])})
      </div>

      <div className="card card-yellow">
        <strong>{t('deficiencyDiagnosis')}:</strong>
        <ul>
          {result.deficiencies.length === 0 && <li>{t('healthy')}</li>}
          {result.deficiencies.map((d, i) => (
            <li key={i}>{d.nutrient} — {t(STATUS_KEY[d.status])}</li>
          ))}
        </ul>
      </div>

      <div className="card card-green">
        <strong>{t('recommendedCrops')}:</strong> {result.recommendedCrops.join(', ')}
      </div>

      <button className="btn btn-secondary" onClick={handleListen}>🔊 {t('listenResults')}</button>
      <button className="btn btn-primary" onClick={handleDownload}>⬇️ {t('downloadReport')}</button>
    </div>
  );
}
