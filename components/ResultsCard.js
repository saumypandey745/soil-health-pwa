import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { speakText } from '../lib/sarvam';
import { generateSoilReport } from '../lib/pdfReport';

const CARD_CLASS = { healthy: 'card-green', moderate: 'card-yellow', severe: 'card-red' };
const STATUS_KEY = { healthy: 'healthy', moderate: 'moderateDeficiency', severe: 'severeDeficiency' };
const GRADE_CLASS = { A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', E: 'grade-e' };

export default function ResultsCard({ result, inputs, photo, lang }) {
  const { t } = useTranslation('common');
  const [selectedSeason, setSelectedSeason] = useState('all');

  function handleListen() {
    const gradeText = result.soilClassification?.healthGrade ? `, ${t('healthGrade')} ${result.soilClassification.healthGrade}` : '';
    const limiting = result.soilClassification?.limitingFactor && result.soilClassification.limitingFactor !== 'None'
      ? `${t('limitingFactor')}: ${result.soilClassification.limitingFactor}. `
      : '';
    const urgentAdvice = result.farmerActionSummary?.urgent ? `${result.farmerActionSummary.urgent}. ` : '';

    const summary = `${t('soilHealthScore')}: ${result.score} out of 100 (${t(STATUS_KEY[result.overall])}${gradeText}). ${limiting}${t('deficiencyDiagnosis')}: ${
      result.deficiencies.length ? result.deficiencies.map((d) => `${d.nutrient} ${d.status}`).join(', ') : t('healthy')
    }. ${t('recommendedCrops')}: ${result.recommendedCrops.join(', ')}. ${urgentAdvice}`;

    speakText(summary, lang);
  }

  function handleDownload() {
    generateSoilReport({ inputs, result, photoDataUrl: photo });
  }

  const nutrientsList = [
    { key: 'n', label: t('nitrogen'), data: result.nutrients?.n, defaultOptimal: '280 - 560 kg/ha' },
    { key: 'p', label: t('phosphorus'), data: result.nutrients?.p, defaultOptimal: '10 - 25 kg/ha' },
    { key: 'k', label: t('potassium'), data: result.nutrients?.k, defaultOptimal: '120 - 280 kg/ha' },
    { key: 'ph', label: t('ph'), data: result.nutrients?.ph, defaultOptimal: '6.0 - 7.5' },
  ];

  const seasonalList = result.seasonalCrops || { kharif: [], rabi: [], zaid: [] };
  const filteredCrops = selectedSeason === 'all'
    ? result.cropRecommendations || result.recommendedCrops.map(name => ({ name, suitability: 85, reasons: [] }))
    : (result.cropRecommendations || []).filter(c => seasonalList[selectedSeason]?.includes(c.name));

  return (
    <div className="results-container">
      {/* 1. Header Score & Grade Card */}
      <div className={`card ${CARD_CLASS[result.overall]} score-banner`}>
        <div className="score-header">
          <div>
            <span className="score-subtitle">{t('soilHealthScore')}</span>
            <div className="score-number">
              {result.score}<span className="score-total">/100</span>
            </div>
            <div className="score-status-tag">
              {t(STATUS_KEY[result.overall])}
            </div>
          </div>
          {result.soilClassification?.healthGrade && (
            <div className="grade-badge-container">
              <span className="grade-label">{t('healthGrade')}</span>
              <div className={`grade-circle ${GRADE_CLASS[result.soilClassification.healthGrade] || 'grade-b'}`}>
                {result.soilClassification.healthGrade}
              </div>
            </div>
          )}
        </div>

        {result.soilClassification && (
          <div className="soil-meta-grid">
            <div className="meta-item">
              <span className="meta-label">{t('phCategory')}:</span>
              <strong>{result.soilClassification.phCategory}</strong>
            </div>
            <div className="meta-item">
              <span className="meta-label">{t('limitingFactor')}:</span>
              <strong className={result.soilClassification.limitingFactor !== 'None' ? 'text-alert' : 'text-good'}>
                {result.soilClassification.limitingFactor === 'None' ? t('statusNone') : result.soilClassification.limitingFactor}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Nutrient Status Dashboard */}
      <div className="card card-clean">
        <h3 className="section-title">📊 {t('nutrientDashboard')}</h3>
        <div className="nutrient-grid">
          {nutrientsList.map(({ key, label, data, defaultOptimal }) => {
            const statusKey = data ? data.status : 'healthy';
            return (
              <div key={key} className={`nutrient-box status-${statusKey}`}>
                <div className="nutrient-title-row">
                  <span className="nutrient-name">{label}</span>
                  <span className={`status-pill pill-${statusKey}`}>{t(STATUS_KEY[statusKey] || statusKey)}</span>
                </div>
                <div className="nutrient-val-row">
                  <span className="nutrient-val">{data ? data.current : inputs[key]} {data?.unit || ''}</span>
                </div>
                <div className="nutrient-optimal">
                  {t('optimalRange')}: {defaultOptimal}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Deficiencies & Soil Strengths */}
      <div className="dual-card-row">
        {/* Deficiencies */}
        <div className="card card-yellow card-half">
          <h4 className="card-subheading">⚠️ {t('deficiencyDiagnosis')}</h4>
          <ul className="bullet-list">
            {result.deficiencies.length === 0 && (
              <li className="text-good">✓ {t('noDeficiencies')}</li>
            )}
            {result.deficiencies.map((d, i) => (
              <li key={i} className="text-severe">
                <strong>{d.nutrient}</strong>: {t(STATUS_KEY[d.status])}
              </li>
            ))}
          </ul>
        </div>

        {/* Strengths */}
        <div className="card card-green card-half">
          <h4 className="card-subheading">🌱 {t('strengthsTitle')}</h4>
          <ul className="bullet-list">
            {(!result.strengths || result.strengths.length === 0) && (
              <li>{t('noStrengths')}</li>
            )}
            {result.strengths?.map((s, i) => (
              <li key={i} className="text-good">
                ✓ {s.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 4. Crop Recommendations & Seasonal Options */}
      <div className="card card-clean">
        <h3 className="section-title">🌾 {t('cropSuitabilityTitle')}</h3>
        <div className="season-tabs">
          <button className={`tab-btn ${selectedSeason === 'all' ? 'tab-active' : ''}`} onClick={() => setSelectedSeason('all')}>
            {t('recommendedCrops')}
          </button>
          <button className={`tab-btn ${selectedSeason === 'kharif' ? 'tab-active' : ''}`} onClick={() => setSelectedSeason('kharif')}>
            {t('kharif')}
          </button>
          <button className={`tab-btn ${selectedSeason === 'rabi' ? 'tab-active' : ''}`} onClick={() => setSelectedSeason('rabi')}>
            {t('rabi')}
          </button>
          <button className={`tab-btn ${selectedSeason === 'zaid' ? 'tab-active' : ''}`} onClick={() => setSelectedSeason('zaid')}>
            {t('zaid')}
          </button>
        </div>

        <div className="crop-list">
          {filteredCrops.length === 0 ? (
            <p className="no-data-msg">{t('noDeficiencies')}</p>
          ) : (
            filteredCrops.map((c, i) => (
              <div key={i} className="crop-card-item">
                <div className="crop-header-row">
                  <span className="crop-name">{c.name}</span>
                  <span className="crop-score">{c.suitability || 85}% {t('suitabilityEstimate')}</span>
                </div>
                {c.reasons && c.reasons.length > 0 && (
                  <p className="crop-reason-text">✓ {c.reasons.join(' • ')}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 5. Safe Farmer Action Plan */}
      {result.farmerActionSummary && (
        <div className="card card-clean action-plan-card">
          <h3 className="section-title">🚜 {t('actionPlanTitle')}</h3>
          <div className="action-row">
            <span className="action-tag urgent">{t('urgentAction')}:</span>
            <p className="action-text">{result.farmerActionSummary.urgent}</p>
          </div>
          <div className="action-row">
            <span className="action-tag longterm">{t('longTermAction')}:</span>
            <p className="action-text">{result.farmerActionSummary.longTerm}</p>
          </div>

          <div className="disclaimer-box">
            <strong>⚠️ {t('disclaimerTitle')}:</strong> {t('fertilizerDisclaimer')}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <button className="btn btn-secondary" onClick={handleListen}>
        🔊 {t('listenResults')}
      </button>
      <button className="btn btn-primary" onClick={handleDownload}>
        ⬇️ {t('downloadReport')}
      </button>
    </div>
  );
}
