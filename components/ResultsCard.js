import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { speakText } from '../lib/sarvam';
import { generateSoilReport } from '../lib/pdfReport';
import { calculateSoilTrend } from '../lib/historyLogic';
import CropDecisionAssistant from './CropDecisionAssistant';
import FarmerAssistant from './FarmerAssistant';

const CARD_CLASS = { healthy: 'card-green', moderate: 'card-yellow', severe: 'card-red' };
const STATUS_KEY = { healthy: 'healthy', moderate: 'moderateDeficiency', severe: 'severeDeficiency' };
const GRADE_CLASS = { A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', E: 'grade-e' };
const FIT_CLASS = { High: 'fit-high', Medium: 'fit-medium', Moderate: 'fit-medium', Low: 'fit-low', 'N/A': 'fit-na' };

export default function ResultsCard({ result, inputs, photo, lang, previousRecord = null }) {
  const { t } = useTranslation('common');
  const [selectedSeason, setSelectedSeason] = useState('all');

  const trend = calculateSoilTrend({ result, inputs }, previousRecord);

  function getLocalizedCrop(name) {
    return t(`crop_${name}`, name);
  }

  function getLocalizedFit(fit) {
    if (!fit) return 'N/A';
    if (fit === 'High') return t('fit_High', 'High');
    if (fit === 'Moderate' || fit === 'Medium') return t('fit_Moderate', 'Moderate');
    if (fit === 'Low') return t('fit_Low', 'Low');
    return fit;
  }

  function handleListen() {
    const grade = result.soilClassification?.healthGrade;
    const limiting = result.soilClassification?.limitingFactor;
    const topCrop = result.cropRecommendations?.[0]?.name;
    const urgentAdvice = result.farmerActionSummary?.urgent;

    let summary = '';
    if (lang === 'hi') {
      summary = `आपकी मिट्टी का स्वास्थ्य स्कोर 100 में से ${result.score} है, स्थिति ${t(STATUS_KEY[result.overall])}${grade ? `, ग्रेड ${grade}` : ''}। `;
      if (limiting && limiting !== 'None') {
        summary += `मुख्य समस्या ${limiting} की कमी है। `;
      }
      if (topCrop) {
        summary += `सबसे उपयुक्त फसल ${getLocalizedCrop(topCrop)} है। `;
      }
      if (urgentAdvice) {
        summary += `सलाह: ${urgentAdvice}`;
      }
    } else if (lang === 'kn') {
      summary = `ನಿಮ್ಮ ಮಣ್ಣಿನ ಆರೋಗ್ಯ ಅಂಕ 100 ರಲ್ಲಿ ${result.score}, ಸ್ಥಿತಿ ${t(STATUS_KEY[result.overall])}${grade ? `, ಗ್ರೇಡ್ ${grade}` : ''}. `;
      if (limiting && limiting !== 'None') {
        summary += `ಮುಖ್ಯ ಸೀಮಿತಗೊಳಿಸುವ ಅಂಶ ${limiting}. `;
      }
      if (topCrop) {
        summary += `ಶಿಫಾರಸು ಮಾಡಿದ ಬೆಳೆ ${getLocalizedCrop(topCrop)}. `;
      }
      if (urgentAdvice) {
        summary += `ಕ್ರಮ: ${urgentAdvice}`;
      }
    } else {
      const gradeText = grade ? `, ${t('healthGrade')} ${grade}` : '';
      const limitingText = limiting && limiting !== 'None' ? `${t('limitingFactor')}: ${limiting}. ` : '';
      const topCropText = topCrop ? `${t('recommendedCrops')}: ${topCrop}. ` : '';
      const urgentText = urgentAdvice ? `${urgentAdvice}. ` : '';
      summary = `${t('soilHealthScore')}: ${result.score} out of 100 (${t(STATUS_KEY[result.overall])}${gradeText}). ${limitingText}${topCropText}${urgentText}`;
    }

    speakText(summary, lang);
  }

  function handleDownload() {
    generateSoilReport({ inputs, result, photoDataUrl: photo, trendComparison: trend });
  }

  const nutrientsList = [
    { key: 'n', label: t('nitrogen'), data: result.nutrients?.n, defaultOptimal: '280 - 560 kg/ha' },
    { key: 'p', label: t('phosphorus'), data: result.nutrients?.p, defaultOptimal: '10 - 25 kg/ha' },
    { key: 'k', label: t('potassium'), data: result.nutrients?.k, defaultOptimal: '120 - 280 kg/ha' },
    { key: 'ph', label: t('ph'), data: result.nutrients?.ph, defaultOptimal: '6.0 - 7.5' },
  ];

  const seasonalList = result.seasonalCrops || { kharif: [], rabi: [], zaid: [] };
  const allCrops = result.cropRecommendations || result.recommendedCrops.map((name) => ({ name, suitability: 85, reasons: [] }));
  const filteredCrops = selectedSeason === 'all'
    ? allCrops
    : allCrops.filter((c) => seasonalList[selectedSeason]?.includes(c.name));

  const comparisonList = result.cropComparison || [];
  const farmContext = result.farmContext || {};

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

      {/* 2. Farm Context Summary */}
      {farmContext.hasContext && (
        <div className="card card-clean context-badge-card">
          <h4 className="card-subheading">🏡 {t('farmContextSummary')}</h4>
          <div className="context-chips-row">
            {farmContext.season && (
              <span className="context-chip">🗓️ {t(farmContext.season)}</span>
            )}
            {farmContext.waterAvailability && (
              <span className="context-chip">
                {farmContext.waterAvailability === 'rainfed' ? '🌧️' : farmContext.waterAvailability === 'limited' ? '💧' : '🌊'}{' '}
                {t(farmContext.waterAvailability === 'rainfed' ? 'waterRainfed' : farmContext.waterAvailability === 'limited' ? 'waterLimited' : 'waterReliable')}
              </span>
            )}
            {farmContext.location?.district && (
              <span className="context-chip">📍 {farmContext.location.district}{farmContext.location.state ? `, ${farmContext.location.state}` : ''}</span>
            )}
            {farmContext.preferredCrop && (
              <span className="context-chip">⭐ {t('preferredCrop')}: {getLocalizedCrop(farmContext.preferredCrop)}</span>
            )}
            {farmContext.previousCrop && (
              <span className="context-chip">🔄 {t('previousCrop')}: {getLocalizedCrop(farmContext.previousCrop)}</span>
            )}
          </div>
        </div>
      )}

      {/* 3. Soil Health Progress Trend */}
      {trend.hasComparison && (
        <div className="card card-clean trend-card">
          <div className="trend-header-row">
            <h4 className="card-subheading">📈 {t('trendComparisonTitle')}</h4>
            <span className={`status-pill pill-${trend.trendStatus === 'improving' ? 'healthy' : trend.trendStatus === 'needs_attention' ? 'severe' : 'moderate'}`}>
              {t(trend.trendStatus === 'improving' ? 'improving' : trend.trendStatus === 'needs_attention' ? 'needsAttention' : 'stable')}
            </span>
          </div>
          <div className="trend-stat-row">
            <div className="trend-stat">
              <span className="meta-label">{t('previousScore')}</span>
              <strong>{trend.prevScore}/100</strong>
            </div>
            <div className="trend-stat">
              <span className="meta-label">{t('scoreChange')}</span>
              <strong className={trend.scoreDelta > 0 ? 'text-good' : trend.scoreDelta < 0 ? 'text-alert' : ''}>
                {trend.scoreDelta > 0 ? `+${trend.scoreDelta}` : trend.scoreDelta}
              </strong>
            </div>
          </div>
          <p className="trend-explanation">{trend.trendSummary}</p>
        </div>
      )}

      {/* 4. Nutrient Status Dashboard */}
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

      {/* 5. Deficiencies & Soil Strengths */}
      <div className="dual-card-row">
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

      {/* 6. Context-Aware Crop Recommendations */}
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
                  <span className="crop-name">
                    {c.isPreferred && '⭐ '}{getLocalizedCrop(c.name)}
                  </span>
                  <span className="crop-score">{c.suitability || 85}% {t('suitabilityEstimate')}</span>
                </div>
                {c.reasons && c.reasons.length > 0 && (
                  <p className="crop-reason-text">✓ {c.reasons.join(' • ')}</p>
                )}
                {c.considerations && c.considerations.length > 0 && (
                  <p className="crop-caution-text">⚠️ {c.considerations.join(' • ')}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* 7. Crop Comparison Matrix */}
      {comparisonList.length > 1 && (
        <div className="card card-clean">
          <h3 className="section-title">📊 {t('cropComparisonTitle')}</h3>
          <div className="comparison-card-grid">
            {comparisonList.map((item, idx) => (
              <div key={idx} className="comparison-card">
                <div className="comp-card-top">
                  <strong>{getLocalizedCrop(item.name)}</strong>
                  <span className="comp-score-tag">{item.overallScore}%</span>
                </div>
                <div className="comp-metrics">
                  <div className="comp-metric-item">
                    <span>{t('cropSoilFit')}</span>
                    <span className={`fit-pill ${FIT_CLASS[item.soilFit]}`}>{getLocalizedFit(item.soilFit)}</span>
                  </div>
                  <div className="comp-metric-item">
                    <span>{t('cropSeasonFit')}</span>
                    <span className={`fit-pill ${FIT_CLASS[item.seasonFit]}`}>{getLocalizedFit(item.seasonFit)}</span>
                  </div>
                  <div className="comp-metric-item">
                    <span>{t('cropWaterFit')}</span>
                    <span className={`fit-pill ${FIT_CLASS[item.waterFit]}`}>{getLocalizedFit(item.waterFit)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Interactive Crop Decision Assistant (Phase 3B) */}
      <CropDecisionAssistant
        cropRecommendations={result.cropRecommendations || []}
        farmContext={farmContext}
        soilInputs={inputs}
        soilScore={result.score}
      />

      {/* 9. Safe Farmer Action Plan */}
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

      {/* 10. AI Farmer Assistant (Phase 3C) */}
      <FarmerAssistant
        result={result}
        inputs={inputs}
        farmContext={farmContext}
        lang={lang}
      />

      {/* 11. Action Buttons */}
      <button className="btn btn-secondary" onClick={handleListen}>
        🔊 {t('listenResults')}
      </button>
      <button className="btn btn-primary" onClick={handleDownload}>
        ⬇️ {t('downloadReport')}
      </button>
    </div>
  );
}

