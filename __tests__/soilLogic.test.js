import { analyzeSoil } from '../lib/soilLogic';

describe('Soil Logic - analyzeSoil()', () => {
  test('healthy case returns score 100, healthy overall, and no deficiencies', () => {
    const result = analyzeSoil({ n: 350, p: 18, k: 200, ph: 6.8 });
    expect(result.score).toBe(100);
    expect(result.overall).toBe('healthy');
    expect(result.deficiencies).toEqual([]);
    expect(result.recommendedCrops.length).toBeGreaterThanOrEqual(1);
  });

  test('severe deficiency for Nitrogen (N) when below 60% of threshold', () => {
    const result = analyzeSoil({ n: 100, p: 18, k: 200, ph: 6.8 });
    const nDeficiency = result.deficiencies.find((d) => d.nutrient === 'Nitrogen (N)');
    expect(nDeficiency).toBeDefined();
    expect(nDeficiency.status).toBe('severe');
  });

  test('severe deficiency for Phosphorus (P) when below 60% of threshold', () => {
    const result = analyzeSoil({ n: 350, p: 4, k: 200, ph: 6.8 });
    const pDeficiency = result.deficiencies.find((d) => d.nutrient === 'Phosphorus (P)');
    expect(pDeficiency).toBeDefined();
    expect(pDeficiency.status).toBe('severe');
  });

  test('severe deficiency for Potassium (K) when below 60% of threshold', () => {
    const result = analyzeSoil({ n: 350, p: 18, k: 50, ph: 6.8 });
    const kDeficiency = result.deficiencies.find((d) => d.nutrient === 'Potassium (K)');
    expect(kDeficiency).toBeDefined();
    expect(kDeficiency.status).toBe('severe');
  });

  test('moderate deficiency for a single low nutrient', () => {
    // 200 is between 168 (280 * 0.6) and 280
    const result = analyzeSoil({ n: 200, p: 18, k: 200, ph: 6.8 });
    expect(result.deficiencies).toHaveLength(1);
    expect(result.deficiencies[0]).toEqual({ nutrient: 'Nitrogen (N)', status: 'moderate' });
    expect(result.score).toBe(90);
  });

  test('excess nitrogen flagged moderate deficiency', () => {
    // n > 560
    const result = analyzeSoil({ n: 600, p: 18, k: 200, ph: 6.8 });
    const nDeficiency = result.deficiencies.find((d) => d.nutrient === 'Nitrogen (N)');
    expect(nDeficiency).toBeDefined();
    expect(nDeficiency.status).toBe('moderate');
  });

  test('pH too acidic is flagged as deficiency', () => {
    const result = analyzeSoil({ n: 350, p: 18, k: 200, ph: 5.0 });
    const phDeficiency = result.deficiencies.find((d) => d.nutrient === 'pH balance');
    expect(phDeficiency).toBeDefined();
    expect(phDeficiency.status).toBe('moderate');
  });

  test('pH too alkaline is flagged as deficiency', () => {
    const result = analyzeSoil({ n: 350, p: 18, k: 200, ph: 8.5 });
    const phDeficiency = result.deficiencies.find((d) => d.nutrient === 'pH balance');
    expect(phDeficiency).toBeDefined();
    expect(phDeficiency.status).toBe('moderate');
  });

  test('boundary exactly at low threshold is classified as healthy', () => {
    // Thresholds: n: 280, p: 10, k: 120, ph: 6.0
    const result = analyzeSoil({ n: 280, p: 10, k: 120, ph: 6.0 });
    expect(result.score).toBe(100);
    expect(result.overall).toBe('healthy');
    expect(result.deficiencies).toEqual([]);
  });

  test('just below threshold is classified as moderate deficiency', () => {
    // n = 279 is just below 280, above 280 * 0.6 = 168
    const result = analyzeSoil({ n: 279, p: 10, k: 120, ph: 6.0 });
    const nDeficiency = result.deficiencies.find((d) => d.nutrient === 'Nitrogen (N)');
    expect(nDeficiency).toBeDefined();
    expect(nDeficiency.status).toBe('moderate');
  });

  test('below 60% of threshold is classified as severe deficiency', () => {
    // 280 * 0.6 = 168 -> 167 is below 60%
    const result = analyzeSoil({ n: 167, p: 10, k: 120, ph: 6.0 });
    const nDeficiency = result.deficiencies.find((d) => d.nutrient === 'Nitrogen (N)');
    expect(nDeficiency).toBeDefined();
    expect(nDeficiency.status).toBe('severe');
  });

  test('all-zero input does not throw and returns severe status', () => {
    expect(() => {
      const result = analyzeSoil({ n: 0, p: 0, k: 0, ph: 0 });
      expect(result.score).toBe(25);
      expect(result.overall).toBe('severe');
      expect(result.deficiencies).toHaveLength(4);
      result.deficiencies.forEach((d) => {
        expect(d.status).toBe('severe');
      });
    }).not.toThrow();
  });

  test('fallback crops (Millets, Pulses (Dal)) returned when nothing matches', () => {
    const result = analyzeSoil({ n: 0, p: 0, k: 0, ph: 0 });
    expect(result.recommendedCrops).toEqual(['Millets', 'Pulses (Dal)']);
  });

  test('strong profile returns between 2 and 5 crops', () => {
    const result = analyzeSoil({ n: 350, p: 22, k: 220, ph: 6.5 });
    expect(result.recommendedCrops.length).toBeGreaterThanOrEqual(2);
    expect(result.recommendedCrops.length).toBeLessThanOrEqual(5);
  });

  test('score is always within 0-100 range across diverse inputs', () => {
    const testCases = [
      { n: 0, p: 0, k: 0, ph: 0 },
      { n: 350, p: 20, k: 200, ph: 6.5 },
      { n: 1000, p: 100, k: 800, ph: 14 },
      { n: -50, p: -20, k: -100, ph: -2 },
      { n: 280, p: 10, k: 120, ph: 6.0 },
    ];

    testCases.forEach((input) => {
      const result = analyzeSoil(input);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  test('negative inputs do not throw and return result object', () => {
    expect(() => {
      const result = analyzeSoil({ n: -10, p: -5, k: -20, ph: -1 });
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('deficiencies');
      expect(result).toHaveProperty('recommendedCrops');
    }).not.toThrow();
  });
});
