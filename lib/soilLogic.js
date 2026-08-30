// Standard agronomic thresholds (simplified, kg/ha for NPK, standard 0-14 pH scale)
const THRESHOLDS = {
  n: { low: 280, high: 560 },
  p: { low: 10, high: 25 },
  k: { low: 120, high: 280 },
  ph: { low: 6.0, high: 7.5 },
};

const CROP_DB = [
  { crop: 'Rice', nMin: 280, pMin: 10, kMin: 120, phMin: 5.5, phMax: 7.0 },
  { crop: 'Wheat', nMin: 280, pMin: 15, kMin: 120, phMin: 6.0, phMax: 7.5 },
  { crop: 'Maize', nMin: 250, pMin: 12, kMin: 120, phMin: 5.8, phMax: 7.2 },
  { crop: 'Sugarcane', nMin: 300, pMin: 20, kMin: 200, phMin: 6.0, phMax: 7.5 },
  { crop: 'Cotton', nMin: 250, pMin: 15, kMin: 150, phMin: 6.0, phMax: 8.0 },
  { crop: 'Groundnut', nMin: 150, pMin: 15, kMin: 150, phMin: 6.0, phMax: 7.0 },
  { crop: 'Millets', nMin: 150, pMin: 8, kMin: 100, phMin: 5.5, phMax: 7.5 },
  { crop: 'Pulses (Dal)', nMin: 100, pMin: 10, kMin: 100, phMin: 6.0, phMax: 7.5 },
];

function classify(value, low, high) {
  if (value < low * 0.6) return 'severe';
  if (value < low) return 'moderate';
  if (value > high) return 'moderate'; // excess bhi ek tarah ki deficiency hai (imbalance)
  return 'healthy';
}

export function analyzeSoil({ n, p, k, ph }) {
  const nStatus = classify(n, THRESHOLDS.n.low, THRESHOLDS.n.high);
  const pStatus = classify(p, THRESHOLDS.p.low, THRESHOLDS.p.high);
  const kStatus = classify(k, THRESHOLDS.k.low, THRESHOLDS.k.high);
  const phStatus = classify(ph, THRESHOLDS.ph.low, THRESHOLDS.ph.high);

  const statusScore = { healthy: 100, moderate: 60, severe: 25 };
  const score = Math.round(
    (statusScore[nStatus] + statusScore[pStatus] + statusScore[kStatus] + statusScore[phStatus]) / 4
  );

  const deficiencies = [];
  if (nStatus !== 'healthy') deficiencies.push({ nutrient: 'Nitrogen (N)', status: nStatus });
  if (pStatus !== 'healthy') deficiencies.push({ nutrient: 'Phosphorus (P)', status: pStatus });
  if (kStatus !== 'healthy') deficiencies.push({ nutrient: 'Potassium (K)', status: kStatus });
  if (phStatus !== 'healthy') deficiencies.push({ nutrient: 'pH balance', status: phStatus });

  const recommendedCrops = CROP_DB.filter(
    (c) => n >= c.nMin * 0.8 && p >= c.pMin * 0.8 && k >= c.kMin * 0.8 && ph >= c.phMin && ph <= c.phMax
  )
    .map((c) => c.crop)
    .slice(0, 5);

  const overall = score >= 80 ? 'healthy' : score >= 50 ? 'moderate' : 'severe';

  return {
    score,
    overall,
    deficiencies,
    recommendedCrops: recommendedCrops.length ? recommendedCrops : ['Millets', 'Pulses (Dal)'], // hardy fallback crops
  };
}
