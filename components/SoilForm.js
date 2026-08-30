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
    <form onSubmit={handleSubmit}>
      <div className="input-group">
        <label>{t('nitrogen')}</label>
        <input type="number" min="0" max="1000" required value={values.n} onChange={(e) => update('n', e.target.value)} />
      </div>
      <div className="input-group">
        <label>{t('phosphorus')}</label>
        <input type="number" min="0" max="200" required value={values.p} onChange={(e) => update('p', e.target.value)} />
      </div>
      <div className="input-group">
        <label>{t('potassium')}</label>
        <input type="number" min="0" max="1000" required value={values.k} onChange={(e) => update('k', e.target.value)} />
      </div>
      <div className="input-group">
        <label>{t('ph')}</label>
        <input type="number" min="0" max="14" step="0.1" required value={values.ph} onChange={(e) => update('ph', e.target.value)} />
      </div>
      <button type="submit" className="btn btn-primary">{t('analyze')}</button>
    </form>
  );
}
