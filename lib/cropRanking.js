import { CROP_DB } from './soilLogic';

// Agronomic water requirement profiles based on standard Indian field classifications
export const CROP_WATER_PROFILES = {
  Rice: 'high',
  Sugarcane: 'high',
  Cotton: 'medium',
  Maize: 'medium',
  Wheat: 'medium',
  Groundnut: 'low',
  Millets: 'low',
  'Pulses (Dal)': 'low',
};

const LEGUME_CROPS = ['Pulses (Dal)', 'Groundnut'];
const CEREAL_CROPS = ['Rice', 'Wheat', 'Maize', 'Millets'];

/**
 * Calculates a context-aware ranking of candidate crops using deterministic agronomic rules.
 * Does not replace the baseline soil suitability, but enhances it with farm context modifiers.
 * 
 * @param {Array} baseCropRecommendations - Baseline crops from analyzeSoil
 * @param {Object} farmContext - Normalized farm context from buildFarmContext
 * @param {Object} soilInputs - { n, p, k, ph }
 * @param {number} soilScore - Overall soil score (0-100)
 * @returns {Array} rankedCrops with explainable reasons and considerations
 */
export function rankCropsWithContext({
  baseCropRecommendations = [],
  farmContext = {},
  soilInputs = {},
  soilScore = 80,
}) {
  const { season, waterAvailability, preferredCrop, previousCrop } = farmContext;
  const numPh = Number(soilInputs.ph || 6.5);
  const numN = Number(soilInputs.n || 280);
  const numP = Number(soilInputs.p || 15);
  const numK = Number(soilInputs.k || 150);

  // If base recommendations are simple strings, convert to objects
  const candidateList = baseCropRecommendations.map((item) => {
    if (typeof item === 'string') {
      return { name: item, baseSuitability: 80 };
    }
    return { name: item.name, baseSuitability: item.suitability || 80 };
  });

  const ranked = candidateList.map((candidate) => {
    const cropName = candidate.name;
    const cropDef = CROP_DB.find((c) => c.crop === cropName) || {};
    const seasons = cropDef.seasons || ['kharif', 'rabi'];
    const waterDemand = CROP_WATER_PROFILES[cropName] || 'medium';

    let modifier = 0;
    const reasons = [];
    const considerations = [];

    // 1. Soil Fit evaluation
    const phMatch = numPh >= (cropDef.phMin || 5.5) && numPh <= (cropDef.phMax || 7.5);
    const npkMatch = numN >= (cropDef.nMin || 100) && numP >= (cropDef.pMin || 10) && numK >= (cropDef.kMin || 100);

    let soilFit = 'Moderate';
    if (phMatch && npkMatch) {
      soilFit = 'High';
      reasons.push('Soil NPK and pH are within optimal ranges for this crop');
    } else if (phMatch) {
      soilFit = 'Medium';
      reasons.push('Soil pH is favorable for this crop');
    } else {
      considerations.push('Soil pH or nutrients are outside ideal range; yield may require amendments');
    }

    // 2. Season Compatibility Modifier
    let seasonFit = 'N/A';
    if (season) {
      if (seasons.includes(season)) {
        modifier += 6;
        seasonFit = 'High';
        const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
        reasons.push(`Well-suited for the active ${seasonName} sowing window`);
      } else {
        modifier -= 8;
        seasonFit = 'Low';
        considerations.push(`Typically cultivated in other seasons; confirm local weather window before sowing`);
      }
    }

    // 3. Water Availability Modifier
    let waterFit = 'N/A';
    if (waterAvailability) {
      if (waterAvailability === 'rainfed') {
        if (waterDemand === 'low') {
          modifier += 6;
          waterFit = 'High';
          reasons.push('Drought-hardy crop well-suited for rain-fed conditions');
        } else if (waterDemand === 'medium') {
          modifier += 1;
          waterFit = 'Medium';
          considerations.push('Can grow rain-fed, but supplementary rainfall is needed during flowering');
        } else if (waterDemand === 'high') {
          modifier -= 12;
          waterFit = 'Low';
          considerations.push('High water requirement; rain-fed conditions pose severe drought stress risk');
        }
      } else if (waterAvailability === 'limited') {
        if (waterDemand === 'low' || waterDemand === 'medium') {
          modifier += 4;
          waterFit = 'High';
          reasons.push('Water requirement aligns comfortably with limited irrigation');
        } else if (waterDemand === 'high') {
          modifier -= 5;
          waterFit = 'Medium';
          considerations.push('High water crop; ensure critical irrigation stages can be met with available water');
        }
      } else if (waterAvailability === 'reliable') {
        if (waterDemand === 'high') {
          modifier += 6;
          waterFit = 'High';
          reasons.push('Reliable irrigation fully supports high water requirement');
        } else {
          modifier += 3;
          waterFit = 'High';
          reasons.push('Assured water availability provides stability against dry spells');
        }
      }
    }

    // 4. Farmer Preferred Crop Modifier
    let isPreferred = false;
    if (preferredCrop && cropName.toLowerCase() === preferredCrop.toLowerCase()) {
      isPreferred = true;
      if (candidate.baseSuitability >= 70 && soilFit !== 'Moderate') {
        modifier += 8;
        reasons.push('Matches your preferred crop selection with good soil compatibility');
      } else {
        modifier += 2;
        considerations.push('Your preferred crop has lower suitability under current soil or water conditions');
      }
    }

    // 5. Crop Rotation Modifier (Previous Crop context)
    if (previousCrop) {
      const prevNorm = previousCrop.trim().toLowerCase();
      const isPrevCereal = CEREAL_CROPS.some((c) => c.toLowerCase() === prevNorm);
      const isCurrLegume = LEGUME_CROPS.includes(cropName);

      if (isPrevCereal && isCurrLegume) {
        modifier += 5;
        reasons.push(`Beneficial rotation choice following ${previousCrop} (supports balanced soil health & diversity)`);
      } else if (cropName.toLowerCase() === prevNorm) {
        modifier -= 3;
        considerations.push(`Continuous monocropping after ${previousCrop} may elevate pest pressure`);
      }
    }

    // Compute bounded context suitability score
    const finalScore = Math.min(98, Math.max(45, candidate.baseSuitability + modifier));
    const overallSuitability = finalScore >= 80 ? 'High' : finalScore >= 65 ? 'Moderate' : 'Low';

    return {
      name: cropName,
      score: finalScore,
      suitability: finalScore,
      overallSuitability,
      soilFit,
      seasonFit,
      waterFit,
      isPreferred,
      reasons: reasons.length ? reasons : ['Hardy crop adaptable to current soil profile'],
      considerations,
    };
  });

  // Sort deterministically: highest score first, tie-breaker alphabetical
  ranked.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return ranked;
}

/**
 * Builds a lightweight comparison matrix for the top crops.
 * Suitable for accessible mobile cards.
 * 
 * @param {Array} rankedCrops 
 * @returns {Array} comparisonItems
 */
export function buildCropComparison(rankedCrops = []) {
  return rankedCrops.slice(0, 4).map((c) => ({
    name: c.name,
    overallScore: c.score,
    soilFit: c.soilFit,
    seasonFit: c.seasonFit,
    waterFit: c.waterFit,
    overallSuitability: c.overallSuitability,
    keyAdvantage: c.reasons[0] || 'Adaptable crop',
    keyCaution: c.considerations[0] || 'None',
  }));
}

/**
 * Compares two crops side-by-side using the existing deterministic ranking engine.
 * Completely offline and reuse-driven; does not create a separate scoring system.
 * 
 * @param {string} cropA - Name of the first crop
 * @param {string} cropB - Name of the second crop
 * @param {Object} options - { farmContext, soilInputs, soilScore }
 * @returns {Object} comparison details for both crops
 */
export function evaluateCropPair(cropA, cropB, { farmContext = {}, soilInputs = {}, soilScore = 80 } = {}) {
  if (!cropA || !cropB) return null;
  const normA = cropA.trim();
  const normB = cropB.trim();
  const isSame = normA.toLowerCase() === normB.toLowerCase();

  const evaluatedA = rankCropsWithContext({
    baseCropRecommendations: [{ name: normA, suitability: 80 }],
    farmContext,
    soilInputs,
    soilScore,
  })[0] || { name: normA, score: 75, reasons: [], considerations: [] };

  const evaluatedB = rankCropsWithContext({
    baseCropRecommendations: [{ name: normB, suitability: 80 }],
    farmContext,
    soilInputs,
    soilScore,
  })[0] || { name: normB, score: 75, reasons: [], considerations: [] };

  const rawDemandA = CROP_WATER_PROFILES[normA] || 'medium';
  const rawDemandB = CROP_WATER_PROFILES[normB] || 'medium';

  return {
    cropA: {
      ...evaluatedA,
      waterDemand: rawDemandA.charAt(0).toUpperCase() + rawDemandA.slice(1),
      rotationBonus: evaluatedA.reasons.some((r) => r.toLowerCase().includes('rotation')),
    },
    cropB: {
      ...evaluatedB,
      waterDemand: rawDemandB.charAt(0).toUpperCase() + rawDemandB.slice(1),
      rotationBonus: evaluatedB.reasons.some((r) => r.toLowerCase().includes('rotation')),
    },
    isSame,
  };
}

