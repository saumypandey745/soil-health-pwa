import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { evaluateCropPair } from '../lib/cropRanking';
import { CROP_DB } from '../lib/soilLogic';

const ALL_CROPS = CROP_DB.map((c) => c.crop);

export default function CropDecisionAssistant({
  cropRecommendations = [],
  farmContext = {},
  soilInputs = {},
  soilScore = 80,
}) {
  const { t } = useTranslation('common');

  const defaultA = cropRecommendations[0]?.name || 'Wheat';
  const defaultB = cropRecommendations[1]?.name || (defaultA === 'Maize' ? 'Rice' : 'Maize');

  const [cropA, setCropA] = useState(defaultA);
  const [cropB, setCropB] = useState(defaultB);

  const comparison = evaluateCropPair(cropA, cropB, {
    farmContext,
    soilInputs,
    soilScore,
  });

  function getLocalizedCropName(name) {
    return t(`crop_${name}`, name);
  }

  function getLocalizedFit(fit) {
    if (!fit) return 'N/A';
    if (fit === 'High') return t('fit_High', 'High');
    if (fit === 'Moderate' || fit === 'Medium') return t('fit_Moderate', 'Moderate');
    if (fit === 'Low') return t('fit_Low', 'Low');
    return fit;
  }

  const fitClass = {
    High: 'fit-high',
    Moderate: 'fit-medium',
    Medium: 'fit-medium',
    Low: 'fit-low',
    'N/A': 'fit-na',
  };

  function handleSelectCropA(newA) {
    setCropA(newA);
    if (newA === cropB) {
      const altB = ALL_CROPS.find((c) => c !== newA) || 'Maize';
      setCropB(altB);
    }
  }

  function handleSelectCropB(newB) {
    setCropB(newB);
    if (newB === cropA) {
      const altA = ALL_CROPS.find((c) => c !== newB) || 'Wheat';
      setCropA(altA);
    }
  }

  return (
    <div className="card card-clean crop-decision-box" aria-label="Crop Decision Assistant">
      <div className="form-header-box">
        <h3 className="section-title">⚖️ {t('cropDecisionTitle')}</h3>
        <p className="form-subtitle">{t('cropDecisionSubtitle')}</p>
      </div>

      {/* Crop Selectors */}
      <div className="crop-select-grid">
        <div className="input-group">
          <label htmlFor="select-crop-a">{t('selectCropA')}</label>
          <select
            id="select-crop-a"
            value={cropA}
            onChange={(e) => handleSelectCropA(e.target.value)}
          >
            {ALL_CROPS.map((c) => (
              <option key={`a-${c}`} value={c} disabled={c === cropB}>
                {getLocalizedCropName(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="select-crop-b">{t('selectCropB')}</label>
          <select
            id="select-crop-b"
            value={cropB}
            onChange={(e) => handleSelectCropB(e.target.value)}
          >
            {ALL_CROPS.map((c) => (
              <option key={`b-${c}`} value={c} disabled={c === cropA}>
                {getLocalizedCropName(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {comparison && comparison.isSame ? (
        <div className="same-crop-alert">
          ℹ️ {t('sameCropNotice')}
        </div>
      ) : comparison ? (
        <div className="comparison-detail-container">
          {/* Side-by-Side Trade-off Table */}
          <div className="comparison-table-wrapper">
            <table className="decision-comparison-table">
              <thead>
                <tr>
                  <th>{t('comparisonFactor')}</th>
                  <th>{getLocalizedCropName(cropA)}</th>
                  <th>{getLocalizedCropName(cropB)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>{t('overallScore')}</strong></td>
                  <td>
                    <span className="comp-score-tag">{comparison.cropA.score}%</span>
                  </td>
                  <td>
                    <span className="comp-score-tag">{comparison.cropB.score}%</span>
                  </td>
                </tr>
                <tr>
                  <td>{t('cropSoilFit')}</td>
                  <td>
                    <span className={`fit-pill ${fitClass[comparison.cropA.soilFit]}`}>
                      {getLocalizedFit(comparison.cropA.soilFit)}
                    </span>
                  </td>
                  <td>
                    <span className={`fit-pill ${fitClass[comparison.cropB.soilFit]}`}>
                      {getLocalizedFit(comparison.cropB.soilFit)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>{t('waterDemandLabel')}</td>
                  <td>
                    <span className="meta-demand">
                      {t(`waterDemand_${comparison.cropA.waterDemand}`, comparison.cropA.waterDemand)}
                    </span>
                    {comparison.cropA.waterFit !== 'N/A' && (
                      <span className={`fit-pill ${fitClass[comparison.cropA.waterFit]}`}>
                        {getLocalizedFit(comparison.cropA.waterFit)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="meta-demand">
                      {t(`waterDemand_${comparison.cropB.waterDemand}`, comparison.cropB.waterDemand)}
                    </span>
                    {comparison.cropB.waterFit !== 'N/A' && (
                      <span className={`fit-pill ${fitClass[comparison.cropB.waterFit]}`}>
                        {getLocalizedFit(comparison.cropB.waterFit)}
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td>{t('cropSeasonFit')}</td>
                  <td>
                    <span className={`fit-pill ${fitClass[comparison.cropA.seasonFit]}`}>
                      {getLocalizedFit(comparison.cropA.seasonFit)}
                    </span>
                  </td>
                  <td>
                    <span className={`fit-pill ${fitClass[comparison.cropB.seasonFit]}`}>
                      {getLocalizedFit(comparison.cropB.seasonFit)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Qualitative Trade-off Cards */}
          <div className="dual-card-row decision-why-row">
            <div className="decision-why-card">
              <h4 className="crop-subheading">🌾 {getLocalizedCropName(cropA)}</h4>
              <div className="why-section">
                <span className="why-label text-good">✓ {t('whyRecommended')}:</span>
                <p className="why-text">{comparison.cropA.reasons[0] || t('adaptableCropNotice')}</p>
              </div>
              {comparison.cropA.considerations.length > 0 && (
                <div className="why-section">
                  <span className="why-label text-alert">⚠️ {t('whatToConsider')}:</span>
                  <p className="why-text caution">{comparison.cropA.considerations[0]}</p>
                </div>
              )}
            </div>

            <div className="decision-why-card">
              <h4 className="crop-subheading">🌾 {getLocalizedCropName(cropB)}</h4>
              <div className="why-section">
                <span className="why-label text-good">✓ {t('whyRecommended')}:</span>
                <p className="why-text">{comparison.cropB.reasons[0] || t('adaptableCropNotice')}</p>
              </div>
              {comparison.cropB.considerations.length > 0 && (
                <div className="why-section">
                  <span className="why-label text-alert">⚠️ {t('whatToConsider')}:</span>
                  <p className="why-text caution">{comparison.cropB.considerations[0]}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
