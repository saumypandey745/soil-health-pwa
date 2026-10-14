import { evaluateCropPair } from '../lib/cropRanking';

describe('Phase 3B - Crop Decision Assistant (lib/cropRanking.js: evaluateCropPair)', () => {
  const mockSoilInputs = { n: 220, p: 18, k: 180, ph: 6.8 };
  const mockFarmContext = {
    season: 'rabi',
    waterAvailability: 'limited',
    previousCrop: 'Rice',
  };

  test('handles identical crops gracefully with isSame: true', () => {
    const result = evaluateCropPair('Wheat', 'Wheat', {
      farmContext: mockFarmContext,
      soilInputs: mockSoilInputs,
      soilScore: 82,
    });

    expect(result).toBeDefined();
    expect(result.isSame).toBe(true);
    expect(result.cropA.name).toBe('Wheat');
    expect(result.cropB.name).toBe('Wheat');
  });

  test('compares two distinct crops with deterministic factor breakdown', () => {
    const result = evaluateCropPair('Wheat', 'Rice', {
      farmContext: mockFarmContext,
      soilInputs: mockSoilInputs,
      soilScore: 82,
    });

    expect(result.isSame).toBe(false);
    expect(result.cropA.name).toBe('Wheat');
    expect(result.cropB.name).toBe('Rice');

    // Factors preserved
    expect(result.cropA).toHaveProperty('score');
    expect(result.cropA).toHaveProperty('soilFit');
    expect(result.cropA).toHaveProperty('waterDemand');
    expect(result.cropA).toHaveProperty('waterFit');
    expect(result.cropA).toHaveProperty('seasonFit');
    expect(result.cropA).toHaveProperty('reasons');
    expect(result.cropA).toHaveProperty('considerations');

    // In Rabi season with limited water, Wheat should score higher than Kharif/high-water Rice
    expect(result.cropA.seasonFit).toBe('High');
    expect(result.cropB.seasonFit).toBe('Low');
    expect(result.cropA.score).toBeGreaterThan(result.cropB.score);
  });

  test('evaluates drought-hardy vs water-demanding crops under rainfed conditions', () => {
    const rainfedContext = {
      season: 'kharif',
      waterAvailability: 'rainfed',
    };

    const result = evaluateCropPair('Millets', 'Rice', {
      farmContext: rainfedContext,
      soilInputs: mockSoilInputs,
      soilScore: 75,
    });

    expect(result.cropA.waterDemand).toBe('Low');
    expect(result.cropB.waterDemand).toBe('High');
    expect(result.cropA.waterFit).toBe('High');
    expect(result.cropB.waterFit).toBe('Low');
    expect(result.cropB.considerations.some((c) => c.toLowerCase().includes('water'))).toBe(true);
  });

  test('rewards crop rotation when preceding crop differs from current', () => {
    const pulsesVsRice = evaluateCropPair('Pulses (Dal)', 'Rice', {
      farmContext: {
        previousCrop: 'Rice',
        season: 'rabi',
      },
      soilInputs: mockSoilInputs,
    });

    // Pulses following Rice should enjoy rotation benefits
    expect(pulsesVsRice.cropA.rotationBonus).toBe(true);
    expect(pulsesVsRice.cropA.reasons.some((r) => r.toLowerCase().includes('rotation'))).toBe(true);
  });

  test('does not invent universal fertilizer dosages in considerations or reasons', () => {
    const result = evaluateCropPair('Wheat', 'Maize', {
      farmContext: mockFarmContext,
      soilInputs: { n: 120, p: 10, k: 90, ph: 5.5 }, // deficient soil
      soilScore: 50,
    });

    const allNotes = [
      ...result.cropA.reasons,
      ...result.cropA.considerations,
      ...result.cropB.reasons,
      ...result.cropB.considerations,
    ];

    // Ensure no static kg/ha or universal chemical dosage claims are made
    allNotes.forEach((note) => {
      expect(note).not.toMatch(/\b\d+\s*kg\/acre\b/i);
      expect(note).not.toMatch(/\b\d+\s*kg\/ha\b/i);
      expect(note).not.toMatch(/\bapply\s+\d+\s*kg\b/i);
    });
  });

  test('handles unknown crop names gracefully with fallback profile', () => {
    const result = evaluateCropPair('Dragonfruit', 'Wheat', {
      farmContext: mockFarmContext,
      soilInputs: mockSoilInputs,
    });

    expect(result).toBeDefined();
    expect(result.cropA.name).toBe('Dragonfruit');
    expect(result.cropA.soilFit).toBeDefined();
    expect(result.cropB.name).toBe('Wheat');
  });
});
