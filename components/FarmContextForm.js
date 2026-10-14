import { useState } from 'react';
import { useTranslation } from 'next-i18next';

export default function FarmContextForm({ onSubmit, onSkip, onBack, initialValues = {} }) {
  const { t } = useTranslation('common');

  const [state, setState] = useState(initialValues.location?.state || '');
  const [district, setDistrict] = useState(initialValues.location?.district || '');
  const [village, setVillage] = useState(initialValues.location?.village || '');
  const [season, setSeason] = useState(initialValues.season || '');
  const [waterAvailability, setWaterAvailability] = useState(initialValues.waterAvailability || '');
  const [preferredCrop, setPreferredCrop] = useState(initialValues.preferredCrop || '');
  const [currentCrop, setCurrentCrop] = useState(initialValues.currentCrop || '');
  const [previousCrop, setPreviousCrop] = useState(initialValues.previousCrop || '');

  function handleSubmit(e) {
    e?.preventDefault();
    onSubmit({
      location: { state, district, village },
      season,
      waterAvailability,
      preferredCrop,
      currentCrop,
      previousCrop,
    });
  }

  function handleSkip() {
    onSkip();
  }

  return (
    <form onSubmit={handleSubmit} className="card card-clean farm-context-form" aria-label="Farm Context Form">
      <div className="form-header-box">
        <h2 className="section-title">🌾 {t('farmContextTitle')}</h2>
        <p className="form-subtitle">{t('farmContextSubtitle')}</p>
      </div>

      {/* Season Selection */}
      <div className="input-group">
        <label className="field-label">{t('season')}</label>
        <div className="season-selector-grid">
          {[
            { id: 'kharif', label: t('kharif'), desc: t('kharifDesc') },
            { id: 'rabi', label: t('rabi'), desc: t('rabiDesc') },
            { id: 'zaid', label: t('zaid'), desc: t('zaidDesc') },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card ${season === item.id ? 'choice-selected' : ''}`}
              onClick={() => setSeason(season === item.id ? '' : item.id)}
            >
              <span className="choice-title">{item.label}</span>
              <span className="choice-desc">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Water Availability */}
      <div className="input-group">
        <label className="field-label">{t('waterAvailability')}</label>
        <div className="water-selector-grid">
          {[
            { id: 'rainfed', label: t('waterRainfed'), icon: '🌧️' },
            { id: 'limited', label: t('waterLimited'), icon: '💧' },
            { id: 'reliable', label: t('waterReliable'), icon: '🌊' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={`choice-card choice-compact ${waterAvailability === item.id ? 'choice-selected' : ''}`}
              onClick={() => setWaterAvailability(waterAvailability === item.id ? '' : item.id)}
            >
              <span className="choice-icon">{item.icon}</span>
              <span className="choice-title">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferred Crop & Rotation History */}
      <div className="input-group">
        <label htmlFor="preferred-crop">{t('preferredCrop')}</label>
        <select
          id="preferred-crop"
          value={preferredCrop}
          onChange={(e) => setPreferredCrop(e.target.value)}
        >
          <option value="">-- {t('selectOptional')} --</option>
          <option value="Wheat">{t('crop_Wheat', 'Wheat')}</option>
          <option value="Rice">{t('crop_Rice', 'Rice')}</option>
          <option value="Maize">{t('crop_Maize', 'Maize')}</option>
          <option value="Sugarcane">{t('crop_Sugarcane', 'Sugarcane')}</option>
          <option value="Cotton">{t('crop_Cotton', 'Cotton')}</option>
          <option value="Groundnut">{t('crop_Groundnut', 'Groundnut')}</option>
          <option value="Millets">{t('crop_Millets', 'Millets')}</option>
          <option value="Pulses (Dal)">{t('crop_Pulses (Dal)', 'Pulses (Dal)')}</option>
        </select>
      </div>

      <div className="dual-input-row">
        <div className="input-group">
          <label htmlFor="previous-crop">{t('previousCrop')}</label>
          <input
            id="previous-crop"
            type="text"
            placeholder="e.g. Rice / Fallow"
            value={previousCrop}
            onChange={(e) => setPreviousCrop(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label htmlFor="current-crop">{t('currentCrop')}</label>
          <input
            id="current-crop"
            type="text"
            placeholder="e.g. Sowing planned"
            value={currentCrop}
            onChange={(e) => setCurrentCrop(e.target.value)}
          />
        </div>
      </div>

      {/* Location (Manual, Optional) */}
      <div className="input-group">
        <label className="field-label">{t('location')} ({t('optional')})</label>
        <div className="triple-input-row">
          <input
            type="text"
            placeholder={t('state')}
            value={state}
            onChange={(e) => setState(e.target.value)}
            aria-label={t('state')}
          />
          <input
            type="text"
            placeholder={t('district')}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label={t('district')}
          />
          <input
            type="text"
            placeholder={t('village')}
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            aria-label={t('village')}
          />
        </div>
      </div>

      {/* Actions */}
      <button type="submit" className="btn btn-primary">
        ✨ {t('personalizeResults')}
      </button>
      <button type="button" className="btn btn-secondary" onClick={handleSkip}>
        ⏭️ {t('skipForNow')}
      </button>
      {onBack && (
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ⬅️ {t('back')}
        </button>
      )}
    </form>
  );
}
