import { rankCropsWithContext, buildCropComparison, CROP_WATER_PROFILES } from '../lib/cropRanking';

describe('Phase 2 - Context-Aware Crop Ranking Engine (lib/cropRanking.js)', () => {
  const baseCandidates = [
    { name: 'Rice', suitability: 85 },
    { name: 'Wheat', suitability: 85 },
    { name: 'Millets', suitability: 80 },
    { name: 'Pulses (Dal)', suitability: 80 },
    { name: 'Cotton', suitability: 80 },
  ];

  describe('Water Availability Modifiers', () => {
    test('boosts drought-hardy crops and penalizes high-water crops under rainfed conditions', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { waterAvailability: 'rainfed' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const millets = ranked.find((c) => c.name === 'Millets');
      const rice = ranked.find((c) => c.name === 'Rice');

      expect(millets.waterFit).toBe('High');
      expect(rice.waterFit).toBe('Low');
      expect(millets.score).toBeGreaterThan(rice.score);
      expect(rice.considerations.some((c) => c.includes('High water requirement'))).toBe(true);
    });

    test('supports water-intensive crops under reliable irrigation', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { waterAvailability: 'reliable' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const rice = ranked.find((c) => c.name === 'Rice');
      expect(rice.waterFit).toBe('High');
      expect(rice.reasons.some((r) => r.includes('Reliable irrigation fully supports'))).toBe(true);
    });
  });

  describe('Season Compatibility', () => {
    test('rewards in-season crops and flags out-of-season crops', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { season: 'kharif' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const rice = ranked.find((c) => c.name === 'Rice'); // Kharif crop
      const wheat = ranked.find((c) => c.name === 'Wheat'); // Rabi crop

      expect(rice.seasonFit).toBe('High');
      expect(wheat.seasonFit).toBe('Low');
      expect(wheat.considerations.some((c) => c.includes('Typically cultivated in other seasons'))).toBe(true);
    });
  });

  describe('Preferred Crop & Crop Rotation', () => {
    test('marks preferred crop and gives preference bonus if soil is compatible', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { preferredCrop: 'Wheat' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const wheat = ranked.find((c) => c.name === 'Wheat');
      const rice = ranked.find((c) => c.name === 'Rice');

      expect(wheat.isPreferred).toBe(true);
      expect(rice.isPreferred).toBe(false);
      expect(wheat.reasons.some((r) => r.includes('Matches your preferred crop'))).toBe(true);
    });

    test('applies legume rotation bonus following cereal previous crop', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { previousCrop: 'Rice' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const pulses = ranked.find((c) => c.name === 'Pulses (Dal)');
      expect(pulses.reasons.some((r) => r.includes('Beneficial rotation choice following Rice'))).toBe(true);
    });

    test('adds monocropping consideration when current candidate matches previous crop', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { previousCrop: 'Cotton' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const cotton = ranked.find((c) => c.name === 'Cotton');
      expect(cotton.considerations.some((c) => c.includes('Continuous monocropping after Cotton'))).toBe(true);
    });
  });

  describe('buildCropComparison Matrix', () => {
    test('constructs comparison cards limited to top 4 crops with required dimensions', () => {
      const ranked = rankCropsWithContext({
        baseCropRecommendations: baseCandidates,
        farmContext: { season: 'kharif', waterAvailability: 'rainfed' },
        soilInputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      });

      const comparison = buildCropComparison(ranked);
      expect(comparison.length).toBeLessThanOrEqual(4);
      expect(comparison.length).toBeGreaterThan(0);

      const first = comparison[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('overallScore');
      expect(first).toHaveProperty('soilFit');
      expect(first).toHaveProperty('seasonFit');
      expect(first).toHaveProperty('waterFit');
      expect(first).toHaveProperty('overallSuitability');
      expect(first).toHaveProperty('keyAdvantage');
      expect(first).toHaveProperty('keyCaution');
    });
  });
});
