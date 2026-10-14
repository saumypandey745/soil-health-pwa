import {
  analyzeSoil,
  classifyPh,
  calculateHealthGrade,
  determineLimitingFactor,
  SOIL_THRESHOLDS,
  CROP_DB,
} from '../lib/soilLogic';

describe('Phase 1 - Advanced Soil Intelligence & Classification', () => {
  describe('pH Classification (classifyPh)', () => {
    test('classifies strongly acidic soil (pH < 5.0)', () => {
      expect(classifyPh(4.5)).toBe('Strongly Acidic');
      expect(classifyPh(0)).toBe('Strongly Acidic');
      expect(classifyPh(4.99)).toBe('Strongly Acidic');
    });

    test('classifies acidic soil (5.0 <= pH < 6.0)', () => {
      expect(classifyPh(5.0)).toBe('Acidic');
      expect(classifyPh(5.5)).toBe('Acidic');
      expect(classifyPh(5.99)).toBe('Acidic');
    });

    test('classifies slightly acidic soil (6.0 <= pH < 6.5)', () => {
      expect(classifyPh(6.0)).toBe('Slightly Acidic');
      expect(classifyPh(6.2)).toBe('Slightly Acidic');
      expect(classifyPh(6.49)).toBe('Slightly Acidic');
    });

    test('classifies neutral soil (6.5 <= pH <= 7.5)', () => {
      expect(classifyPh(6.5)).toBe('Neutral');
      expect(classifyPh(7.0)).toBe('Neutral');
      expect(classifyPh(7.5)).toBe('Neutral');
    });

    test('classifies slightly alkaline soil (7.5 < pH <= 8.0)', () => {
      expect(classifyPh(7.6)).toBe('Slightly Alkaline');
      expect(classifyPh(8.0)).toBe('Slightly Alkaline');
    });

    test('classifies moderately alkaline soil (8.0 < pH <= 8.5)', () => {
      expect(classifyPh(8.1)).toBe('Moderately Alkaline');
      expect(classifyPh(8.5)).toBe('Moderately Alkaline');
    });

    test('classifies strongly alkaline soil (pH > 8.5)', () => {
      expect(classifyPh(8.6)).toBe('Strongly Alkaline');
      expect(classifyPh(14.0)).toBe('Strongly Alkaline');
    });
  });

  describe('Health Grade Calculation (calculateHealthGrade)', () => {
    test('maps scores to human-readable grades', () => {
      expect(calculateHealthGrade(100)).toBe('A');
      expect(calculateHealthGrade(90)).toBe('A');
      expect(calculateHealthGrade(89)).toBe('B');
      expect(calculateHealthGrade(80)).toBe('B');
      expect(calculateHealthGrade(79)).toBe('C');
      expect(calculateHealthGrade(70)).toBe('C');
      expect(calculateHealthGrade(69)).toBe('D');
      expect(calculateHealthGrade(50)).toBe('D');
      expect(calculateHealthGrade(49)).toBe('E');
      expect(calculateHealthGrade(25)).toBe('E');
      expect(calculateHealthGrade(0)).toBe('E');
    });
  });

  describe('Limiting Factor Detection (determineLimitingFactor)', () => {
    test('returns "None" when all parameters are healthy', () => {
      const factor = determineLimitingFactor({
        nStatus: 'healthy',
        pStatus: 'healthy',
        kStatus: 'healthy',
        phStatus: 'healthy',
        n: 350,
        p: 20,
        k: 200,
        ph: 6.8,
      });
      expect(factor).toBe('None');
    });

    test('identifies Nitrogen when N is the sole severe deficiency', () => {
      const factor = determineLimitingFactor({
        nStatus: 'severe',
        pStatus: 'healthy',
        kStatus: 'healthy',
        phStatus: 'healthy',
        n: 80,
        p: 20,
        k: 200,
        ph: 6.8,
      });
      expect(factor).toBe('Nitrogen');
    });

    test('identifies Phosphorus when P is the sole severe deficiency', () => {
      const factor = determineLimitingFactor({
        nStatus: 'healthy',
        pStatus: 'severe',
        kStatus: 'healthy',
        phStatus: 'healthy',
        n: 350,
        p: 3,
        k: 200,
        ph: 6.8,
      });
      expect(factor).toBe('Phosphorus');
    });

    test('identifies Potassium when K is the sole severe deficiency', () => {
      const factor = determineLimitingFactor({
        nStatus: 'healthy',
        pStatus: 'healthy',
        kStatus: 'severe',
        phStatus: 'healthy',
        n: 350,
        p: 20,
        k: 40,
        ph: 6.8,
      });
      expect(factor).toBe('Potassium');
    });

    test('breaks ties deterministically when multiple parameters are severe', () => {
      const factor = determineLimitingFactor({
        nStatus: 'severe',
        pStatus: 'severe',
        kStatus: 'severe',
        phStatus: 'severe',
        n: 0,
        p: 0,
        k: 0,
        ph: 0,
      });
      // All zero: Nitrogen has tieOrder 1
      expect(factor).toBe('Nitrogen');
    });
  });

  describe('Enhanced Result Object Contract & Safety', () => {
    test('returns all required Phase 1 structured fields alongside existing fields', () => {
      const result = analyzeSoil({ n: 350, p: 18, k: 200, ph: 6.8 });

      // Preserved legacy fields
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('deficiencies');
      expect(result).toHaveProperty('recommendedCrops');

      // New Phase 1 fields
      expect(result).toHaveProperty('nutrients');
      expect(result).toHaveProperty('soilClassification');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('farmerActionSummary');
      expect(result).toHaveProperty('actionPlan');
      expect(result).toHaveProperty('cropRecommendations');
      expect(result).toHaveProperty('seasonalCrops');
    });

    test('nutrients model exposes normalized attributes for each parameter', () => {
      const result = analyzeSoil({ n: 200, p: 18, k: 200, ph: 6.8 });
      const { n, p, k, ph } = result.nutrients;

      expect(n).toMatchObject({
        current: 200,
        status: 'moderate',
        severity: 'medium',
        optimalRange: [280, 560],
        unit: 'kg/ha',
        label: 'Nitrogen (N)',
      });

      expect(p).toMatchObject({
        current: 18,
        status: 'healthy',
        severity: 'none',
        optimalRange: [10, 25],
        unit: 'kg/ha',
        label: 'Phosphorus (P)',
      });

      expect(k).toMatchObject({
        current: 200,
        status: 'healthy',
        severity: 'none',
        optimalRange: [120, 280],
        unit: 'kg/ha',
        label: 'Potassium (K)',
      });

      expect(ph).toMatchObject({
        current: 6.8,
        status: 'healthy',
        severity: 'none',
        optimalRange: [6.0, 7.5],
        unit: 'pH',
        label: 'Soil pH',
      });
    });

    test('actionPlan adheres to Safe Action Model without hardcoded universal prescriptions', () => {
      const result = analyzeSoil({ n: 100, p: 4, k: 50, ph: 5.0 });

      expect(Array.isArray(result.actionPlan)).toBe(true);
      expect(result.actionPlan.length).toBeGreaterThan(0);

      result.actionPlan.forEach((action) => {
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('priority');
        expect(action).toHaveProperty('target');
        expect(action).toHaveProperty('recommendation');
        expect(action).toHaveProperty('disclaimer');
        // Ensure no hardcoded universal kg/acre prescriptions
        expect(action.recommendation).not.toMatch(/\b\d+\s*-\s*\d+\s*kg\s*\/\s*acre\b/i);
        expect(action.disclaimer).toContain('follow your local soil-test or agricultural advisory');
      });
    });

    test('cropRecommendations includes suitability percentage estimates and reasons', () => {
      const result = analyzeSoil({ n: 350, p: 20, k: 200, ph: 6.5 });
      expect(result.cropRecommendations.length).toBeGreaterThan(0);

      result.cropRecommendations.forEach((cr) => {
        expect(cr).toHaveProperty('name');
        expect(typeof cr.suitability).toBe('number');
        expect(cr.suitability).toBeGreaterThanOrEqual(50);
        expect(cr.suitability).toBeLessThanOrEqual(100);
        expect(Array.isArray(cr.reasons)).toBe(true);
        expect(Array.isArray(cr.considerations)).toBe(true);
        expect(cr.considerations[0]).toContain('suitability estimate');
      });
    });

    test('seasonalCrops partitions recommendations into Kharif, Rabi, and Zaid', () => {
      const result = analyzeSoil({ n: 350, p: 20, k: 200, ph: 6.5 });
      expect(result.seasonalCrops).toHaveProperty('kharif');
      expect(result.seasonalCrops).toHaveProperty('rabi');
      expect(result.seasonalCrops).toHaveProperty('zaid');
      expect(Array.isArray(result.seasonalCrops.kharif)).toBe(true);
      expect(Array.isArray(result.seasonalCrops.rabi)).toBe(true);
      expect(Array.isArray(result.seasonalCrops.zaid)).toBe(true);
    });

    test('identifies positive soil strengths for healthy parameters', () => {
      const result = analyzeSoil({ n: 350, p: 18, k: 200, ph: 6.8 });
      expect(result.strengths.length).toBe(4);
      const targets = result.strengths.map((s) => s.target);
      expect(targets).toContain('nitrogen');
      expect(targets).toContain('phosphorus');
      expect(targets).toContain('potassium');
      expect(targets).toContain('ph');
    });

    test('farmerActionSummary generates structured priority, urgent, and longTerm advice', () => {
      const result = analyzeSoil({ n: 100, p: 18, k: 200, ph: 6.8 });
      expect(result.farmerActionSummary).toHaveProperty('priority');
      expect(result.farmerActionSummary).toHaveProperty('urgent');
      expect(result.farmerActionSummary).toHaveProperty('longTerm');
      expect(result.farmerActionSummary.priority.length).toBeGreaterThan(10);
    });
  });
});
