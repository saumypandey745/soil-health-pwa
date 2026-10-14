import { buildFarmContext } from './farmContext';
import { rankCropsWithContext, buildCropComparison } from './cropRanking';

// Standard agronomic thresholds (simplified, kg/ha for NPK, standard 0-14 pH scale)
export const SOIL_THRESHOLDS = {
  n: { low: 280, high: 560, unit: 'kg/ha', label: 'Nitrogen (N)' },
  p: { low: 10, high: 25, unit: 'kg/ha', label: 'Phosphorus (P)' },
  k: { low: 120, high: 280, unit: 'kg/ha', label: 'Potassium (K)' },
  ph: { low: 6.0, high: 7.5, unit: 'pH', label: 'Soil pH' },
};

// Aliased for backward compatibility with existing code
const THRESHOLDS = SOIL_THRESHOLDS;

export const CROP_DB = [
  { crop: 'Rice', nMin: 280, pMin: 10, kMin: 120, phMin: 5.5, phMax: 7.0, seasons: ['kharif'] },
  { crop: 'Wheat', nMin: 280, pMin: 15, kMin: 120, phMin: 6.0, phMax: 7.5, seasons: ['rabi'] },
  { crop: 'Maize', nMin: 250, pMin: 12, kMin: 120, phMin: 5.8, phMax: 7.2, seasons: ['kharif', 'rabi'] },
  { crop: 'Sugarcane', nMin: 300, pMin: 20, kMin: 200, phMin: 6.0, phMax: 7.5, seasons: ['kharif', 'rabi'] },
  { crop: 'Cotton', nMin: 250, pMin: 15, kMin: 150, phMin: 6.0, phMax: 8.0, seasons: ['kharif'] },
  { crop: 'Groundnut', nMin: 150, pMin: 15, kMin: 150, phMin: 6.0, phMax: 7.0, seasons: ['kharif', 'zaid'] },
  { crop: 'Millets', nMin: 150, pMin: 8, kMin: 100, phMin: 5.5, phMax: 7.5, seasons: ['kharif', 'rabi', 'zaid'] },
  { crop: 'Pulses (Dal)', nMin: 100, pMin: 10, kMin: 100, phMin: 6.0, phMax: 7.5, seasons: ['kharif', 'rabi', 'zaid'] },
];

function classify(value, low, high) {
  if (value < low * 0.6) return 'severe';
  if (value < low) return 'moderate';
  if (value > high) return 'moderate'; // excess bhi ek tarah ki deficiency hai (imbalance)
  return 'healthy';
}

export function classifyPh(ph) {
  if (ph < 5.0) return 'Strongly Acidic';
  if (ph < 6.0) return 'Acidic';
  if (ph < 6.5) return 'Slightly Acidic';
  if (ph <= 7.5) return 'Neutral';
  if (ph <= 8.0) return 'Slightly Alkaline';
  if (ph <= 8.5) return 'Moderately Alkaline';
  return 'Strongly Alkaline';
}

export function calculateHealthGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'E';
}

export function determineLimitingFactor({ nStatus, pStatus, kStatus, phStatus, n, p, k, ph }) {
  const statuses = [
    { target: 'Nitrogen', status: nStatus, ratio: n / THRESHOLDS.n.low, tieOrder: 1 },
    { target: 'Phosphorus', status: pStatus, ratio: p / THRESHOLDS.p.low, tieOrder: 2 },
    { target: 'Potassium', status: kStatus, ratio: k / THRESHOLDS.k.low, tieOrder: 3 },
    {
      target: 'pH',
      status: phStatus,
      ratio: phStatus === 'healthy' ? 1.0 : (ph < 6.0 ? ph / 6.0 : (14 - ph) / (14 - 7.5)),
      tieOrder: 4,
    },
  ];

  const severeFactors = statuses.filter((s) => s.status === 'severe');
  if (severeFactors.length > 0) {
    severeFactors.sort((a, b) => a.ratio - b.ratio || a.tieOrder - b.tieOrder);
    return severeFactors[0].target;
  }

  const moderateFactors = statuses.filter((s) => s.status === 'moderate');
  if (moderateFactors.length > 0) {
    moderateFactors.sort((a, b) => a.ratio - b.ratio || a.tieOrder - b.tieOrder);
    return moderateFactors[0].target;
  }

  return 'None';
}

export function analyzeSoil({ n, p, k, ph }, rawContext = {}) {
  const numN = Number(n);
  const numP = Number(p);
  const numK = Number(k);
  const numPh = Number(ph);
  const farmContext = buildFarmContext(rawContext);

  const nStatus = classify(numN, THRESHOLDS.n.low, THRESHOLDS.n.high);
  const pStatus = classify(numP, THRESHOLDS.p.low, THRESHOLDS.p.high);
  const kStatus = classify(numK, THRESHOLDS.k.low, THRESHOLDS.k.high);
  const phStatus = classify(numPh, THRESHOLDS.ph.low, THRESHOLDS.ph.high);

  const statusScore = { healthy: 100, moderate: 60, severe: 25 };
  const score = Math.round(
    (statusScore[nStatus] + statusScore[pStatus] + statusScore[kStatus] + statusScore[phStatus]) / 4
  );

  const deficiencies = [];
  if (nStatus !== 'healthy') deficiencies.push({ nutrient: 'Nitrogen (N)', status: nStatus });
  if (pStatus !== 'healthy') deficiencies.push({ nutrient: 'Phosphorus (P)', status: pStatus });
  if (kStatus !== 'healthy') deficiencies.push({ nutrient: 'Potassium (K)', status: kStatus });
  if (phStatus !== 'healthy') deficiencies.push({ nutrient: 'pH balance', status: phStatus });

  const matchedCrops = CROP_DB.filter(
    (c) => numN >= c.nMin * 0.8 && numP >= c.pMin * 0.8 && numK >= c.kMin * 0.8 && numPh >= c.phMin && numPh <= c.phMax
  )
    .map((c) => c.crop)
    .slice(0, 5);

  const recommendedCrops = matchedCrops.length ? matchedCrops : ['Millets', 'Pulses (Dal)']; // hardy fallback crops
  const overall = score >= 80 ? 'healthy' : score >= 50 ? 'moderate' : 'severe';

  // 1. Normalized Nutrient Model
  const nutrients = {
    n: {
      current: numN,
      status: nStatus,
      severity: nStatus === 'severe' ? 'high' : nStatus === 'moderate' ? 'medium' : 'none',
      optimalRange: [THRESHOLDS.n.low, THRESHOLDS.n.high],
      unit: THRESHOLDS.n.unit,
      label: THRESHOLDS.n.label,
    },
    p: {
      current: numP,
      status: pStatus,
      severity: pStatus === 'severe' ? 'high' : pStatus === 'moderate' ? 'medium' : 'none',
      optimalRange: [THRESHOLDS.p.low, THRESHOLDS.p.high],
      unit: THRESHOLDS.p.unit,
      label: THRESHOLDS.p.label,
    },
    k: {
      current: numK,
      status: kStatus,
      severity: kStatus === 'severe' ? 'high' : kStatus === 'moderate' ? 'medium' : 'none',
      optimalRange: [THRESHOLDS.k.low, THRESHOLDS.k.high],
      unit: THRESHOLDS.k.unit,
      label: THRESHOLDS.k.label,
    },
    ph: {
      current: numPh,
      status: phStatus,
      severity: phStatus === 'severe' ? 'high' : phStatus === 'moderate' ? 'medium' : 'none',
      optimalRange: [THRESHOLDS.ph.low, THRESHOLDS.ph.high],
      unit: THRESHOLDS.ph.unit,
      label: THRESHOLDS.ph.label,
    },
  };

  // 2. Soil Classification
  const phCategory = classifyPh(numPh);
  const healthGrade = calculateHealthGrade(score);
  const limitingFactor = determineLimitingFactor({
    nStatus,
    pStatus,
    kStatus,
    phStatus,
    n: numN,
    p: numP,
    k: numK,
    ph: numPh,
  });

  const soilClassification = {
    phCategory,
    healthGrade,
    limitingFactor,
  };

  // 3. Soil Strengths
  const strengths = [];
  if (nStatus === 'healthy') {
    strengths.push({ target: 'nitrogen', text: 'Adequate nitrogen reserves for plant growth' });
  }
  if (pStatus === 'healthy') {
    strengths.push({ target: 'phosphorus', text: 'Good phosphorus level supporting healthy roots' });
  }
  if (kStatus === 'healthy') {
    strengths.push({ target: 'potassium', text: 'Optimal potassium level aiding disease and drought resilience' });
  }
  if (phStatus === 'healthy') {
    strengths.push({ target: 'ph', text: 'Balanced soil pH maximizing overall nutrient availability' });
  }

  // 4. Safe Action Plan
  const actionPlan = [];
  const DISCLAIMER = 'For exact fertilizer dosage, follow your local soil-test or agricultural advisory.';

  if (nStatus === 'severe') {
    actionPlan.push({
      type: 'nutrient_management',
      priority: 'high',
      target: 'nitrogen',
      recommendation: 'Prioritize nitrogen replenishment based on your soil-test recommendation.',
      disclaimer: DISCLAIMER,
    });
  } else if (nStatus === 'moderate') {
    if (numN < THRESHOLDS.n.low) {
      actionPlan.push({
        type: 'nutrient_management',
        priority: 'medium',
        target: 'nitrogen',
        recommendation: 'Review nitrogen management based on your soil-test recommendation.',
        disclaimer: DISCLAIMER,
      });
    } else {
      actionPlan.push({
        type: 'nutrient_management',
        priority: 'medium',
        target: 'nitrogen',
        recommendation: 'Moderate nitrogen application to avoid nutrient imbalance and crop lodging.',
        disclaimer: DISCLAIMER,
      });
    }
  }

  if (pStatus === 'severe') {
    actionPlan.push({
      type: 'nutrient_management',
      priority: 'high',
      target: 'phosphorus',
      recommendation: 'Prioritize phosphorus replenishment based on your soil-test recommendation.',
      disclaimer: DISCLAIMER,
    });
  } else if (pStatus === 'moderate') {
    actionPlan.push({
      type: 'nutrient_management',
      priority: 'medium',
      target: 'phosphorus',
      recommendation: 'Review phosphorus management based on your soil-test recommendation.',
      disclaimer: DISCLAIMER,
    });
  }

  if (kStatus === 'severe') {
    actionPlan.push({
      type: 'nutrient_management',
      priority: 'high',
      target: 'potassium',
      recommendation: 'Prioritize potassium replenishment based on your soil-test recommendation.',
      disclaimer: DISCLAIMER,
    });
  } else if (kStatus === 'moderate') {
    actionPlan.push({
      type: 'nutrient_management',
      priority: 'medium',
      target: 'potassium',
      recommendation: 'Review potassium management based on your soil-test recommendation.',
      disclaimer: DISCLAIMER,
    });
  }

  if (phStatus !== 'healthy') {
    const phGuidance = numPh < THRESHOLDS.ph.low
      ? 'Consider crop-specific soil pH guidance for acidic conditions from a qualified agricultural source.'
      : 'Consider crop-specific soil pH guidance and local soil-test recommendations for alkaline soil.';
    actionPlan.push({
      type: 'ph_management',
      priority: 'high',
      target: 'ph',
      recommendation: phGuidance,
      disclaimer: DISCLAIMER,
    });
  }

  // Organic matter & monitoring general advice
  actionPlan.push({
    type: 'organic_matter',
    priority: 'medium',
    target: 'organic_matter',
    recommendation: 'Incorporate well-decomposed farmyard manure, compost, or green manure to enhance soil structure and biological health.',
    disclaimer: DISCLAIMER,
  });

  actionPlan.push({
    type: 'soil_testing',
    priority: 'low',
    target: 'monitoring',
    recommendation: 'Conduct routine periodic soil testing every 1–2 cropping seasons to track fertility trends.',
    disclaimer: DISCLAIMER,
  });

  // 5. Farmer Action Summary
  let priorityText = 'Maintain balanced nutrient management and continue periodic soil testing.';
  let urgentText = 'Continue standard balanced crop nutrition.';
  let longTermText = 'Conduct routine annual soil tests and maintain organic matter practices.';

  if (limitingFactor === 'Nitrogen') {
    priorityText = 'Improve nitrogen status to support vegetative crop growth.';
    urgentText = 'Review nitrogen management according to your soil-test recommendation.';
    longTermText = 'Maintain organic matter and consider legume rotations.';
  } else if (limitingFactor === 'Phosphorus') {
    priorityText = 'Improve phosphorus availability for healthy root establishment.';
    urgentText = 'Review phosphorus management according to your soil-test recommendation.';
    longTermText = 'Apply compost regularly to enhance phosphorus mobilization.';
  } else if (limitingFactor === 'Potassium') {
    priorityText = 'Restore potassium balance to boost crop vigor and stress resilience.';
    urgentText = 'Review potassium management according to your soil-test recommendation.';
    longTermText = 'Incorporate crop residue to recycle potassium back into soil.';
  } else if (limitingFactor === 'pH') {
    priorityText = 'Address soil pH imbalance to ensure optimal nutrient uptake.';
    urgentText = 'Seek region-specific guidance before applying any soil amendment.';
    longTermText = 'Regularly monitor soil reaction following amendments.';
  }

  const farmerActionSummary = {
    priority: priorityText,
    urgent: urgentText,
    longTerm: longTermText,
  };

  // 6. Base Crop Recommendations Metadata
  const baseCropRecommendations = recommendedCrops.map((cropName) => {
    const cropDef = CROP_DB.find((c) => c.crop === cropName);
    const nMatch = numN >= (cropDef?.nMin || 100);
    const pMatch = numP >= (cropDef?.pMin || 10);
    const kMatch = numK >= (cropDef?.kMin || 100);
    const phMatch = numPh >= (cropDef?.phMin || 5.5) && numPh <= (cropDef?.phMax || 7.5);

    const matchCount = (nMatch ? 1 : 0) + (pMatch ? 1 : 0) + (kMatch ? 1 : 0) + (phMatch ? 1 : 0);
    const suitabilityScore = Math.min(95, Math.max(65, 60 + matchCount * 8 + Math.round(score * 0.15)));

    const reasons = [];
    if (phMatch) reasons.push('pH is in the suitable range for this crop');
    if (nMatch && pMatch && kMatch) reasons.push('NPK profile meets baseline crop nutrient demand');
    else reasons.push('Hardy crop adaptable to current nutrient conditions');

    return {
      name: cropName,
      suitability: suitabilityScore,
      score: suitabilityScore,
      overallSuitability: suitabilityScore >= 80 ? 'High' : 'Moderate',
      soilFit: phMatch && nMatch ? 'High' : 'Moderate',
      seasonFit: 'N/A',
      waterFit: 'N/A',
      reasons,
      considerations: ['Rule-based suitability estimate — confirm with local seasonal calendar.'],
    };
  });

  // 7. Context-Aware Crop Ranking (if farm context provided)
  const finalCropRecommendations = farmContext.hasContext
    ? rankCropsWithContext({
        baseCropRecommendations,
        farmContext,
        soilInputs: { n: numN, p: numP, k: numK, ph: numPh },
        soilScore: score,
      })
    : baseCropRecommendations;

  const cropComparison = buildCropComparison(finalCropRecommendations);

  // 8. Seasonal Crop Structure
  const seasonalCrops = {
    kharif: [],
    rabi: [],
    zaid: [],
  };

  recommendedCrops.forEach((cropName) => {
    const cropDef = CROP_DB.find((c) => c.crop === cropName);
    const seasons = cropDef?.seasons || ['kharif', 'rabi'];
    if (seasons.includes('kharif')) seasonalCrops.kharif.push(cropName);
    if (seasons.includes('rabi')) seasonalCrops.rabi.push(cropName);
    if (seasons.includes('zaid')) seasonalCrops.zaid.push(cropName);
  });

  if (!seasonalCrops.kharif.length) seasonalCrops.kharif = ['Millets'];
  if (!seasonalCrops.rabi.length) seasonalCrops.rabi = ['Pulses (Dal)'];
  if (!seasonalCrops.zaid.length) seasonalCrops.zaid = ['Pulses (Dal)'];

  return {
    score,
    overall,
    deficiencies,
    recommendedCrops,
    nutrients,
    soilClassification,
    strengths,
    farmerActionSummary,
    actionPlan,
    cropRecommendations: finalCropRecommendations,
    seasonalCrops,
    farmContext,
    cropComparison,
  };
}
