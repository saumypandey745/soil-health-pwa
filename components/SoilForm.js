import { useState } from 'react';
import { useTranslation } from 'next-i18next';

export default function SoilForm({ onSubmit }) {
  const { t } = useTranslation('common');
  const [values, setValues] = useState({ n: '', p: '', k: '', ph: '' });

  function update(field, val) {
    setValues((v) => ({ ...v, [field]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Soil test parameters form">
      <div className="input-group">
        <label htmlFor="soil-input-n">{t('nitrogen')} (kg/ha)</label>
        <input
          id="soil-input-n"
          type="number"
          inputMode="decimal"
          min="0"
          max="1000"
          required
          placeholder="e.g. 280"
          value={values.n}
          onChange={(e) => update('n', e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="soil-input-p">{t('phosphorus')} (kg/ha)</label>
        <input
          id="soil-input-p"
          type="number"
          inputMode="decimal"
          min="0"
          max="200"
          required
          placeholder="e.g. 15"
          value={values.p}
          onChange={(e) => update('p', e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="soil-input-k">{t('potassium')} (kg/ha)</label>
        <input
          id="soil-input-k"
          type="number"
          inputMode="decimal"
          min="0"
          max="1000"
          required
          placeholder="e.g. 180"
          value={values.k}
          onChange={(e) => update('k', e.target.value)}
        />
      </div>
      <div className="input-group">
        <label htmlFor="soil-input-ph">{t('ph')} (0 - 14)</label>
        <input
          id="soil-input-ph"
          type="number"
          inputMode="decimal"
          min="0"
          max="14"
          step="0.1"
          required
          placeholder="e.g. 6.8"
          value={values.ph}
          onChange={(e) => update('ph', e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary">{t('analyze')}</button>
    </form>
  );
}
