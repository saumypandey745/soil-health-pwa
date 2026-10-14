/**
 * Calculates a deterministic trend comparison between the current test and the most recent previous test.
 * Completely backward-compatible with legacy localStorage records that lack context or extended fields.
 * 
 * @param {Object} currentAnalysis - Current normalized result and inputs
 * @param {Object} previousRecord - Previous test record from localStorage
 * @returns {Object} trendComparison
 */
export function calculateSoilTrend(currentAnalysis = {}, previousRecord = null) {
  if (!previousRecord || typeof previousRecord !== 'object') {
    return {
      hasComparison: false,
      trendStatus: 'stable',
      trendSummary: 'First recorded test. Future tests will display progress trends here.',
      scoreDelta: 0,
      nutrientChanges: [],
    };
  }

  const prevResult = previousRecord.result || {};
  const prevInputs = previousRecord.inputs || {};
  const currResult = currentAnalysis.result || currentAnalysis || {};
  const currInputs = currentAnalysis.inputs || {};

  const prevScore = typeof prevResult.score === 'number' ? prevResult.score : 0;
  const currScore = typeof currResult.score === 'number' ? currResult.score : 0;
  const scoreDelta = currScore - prevScore;

  // Determine trend category
  let trendStatus = 'stable';
  let trendSummary = 'Your soil health score is consistent with your previous recorded test.';

  if (scoreDelta > 3) {
    trendStatus = 'improving';
    trendSummary = `Your soil health score is ${scoreDelta} points higher than your previous recorded test.`;
  } else if (scoreDelta < -3) {
    trendStatus = 'needs_attention';
    trendSummary = `Your soil health score is ${Math.abs(scoreDelta)} points lower than your previous recorded test.`;
  }

  // Calculate individual nutrient changes
  const nutrientKeys = [
    { key: 'n', label: 'Nitrogen (N)', unit: 'kg/ha' },
    { key: 'p', label: 'Phosphorus (P)', unit: 'kg/ha' },
    { key: 'k', label: 'Potassium (K)', unit: 'kg/ha' },
    { key: 'ph', label: 'Soil pH', unit: 'pH' },
  ];

  const nutrientChanges = nutrientKeys.map(({ key, label, unit }) => {
    const prevVal = Number(prevInputs[key] ?? 0);
    const currVal = Number(currInputs[key] ?? 0);
    const delta = Math.round((currVal - prevVal) * 10) / 10;
    let direction = 'same';
    if (delta > 0) direction = 'up';
    else if (delta < 0) direction = 'down';

    return {
      key,
      label,
      unit,
      prevVal,
      currVal,
      delta,
      direction,
    };
  });

  return {
    hasComparison: true,
    previousDate: previousRecord.timestamp || null,
    scoreDelta,
    currScore,
    prevScore,
    trendStatus,
    trendSummary,
    nutrientChanges,
  };
}
