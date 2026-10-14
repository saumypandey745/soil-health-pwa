import { calculateSoilTrend } from '../lib/historyLogic';

describe('Phase 2 - Soil Health Trend Engine (lib/historyLogic.js)', () => {
  describe('calculateSoilTrend Baseline & Edge Cases', () => {
    test('returns safe fallback when there is no prior test record', () => {
      const trend = calculateSoilTrend({ result: { score: 85 }, inputs: { n: 300, p: 20, k: 200, ph: 6.8 } }, null);
      expect(trend.hasComparison).toBe(false);
      expect(trend.trendStatus).toBe('stable');
      expect(trend.scoreDelta).toBe(0);
      expect(trend.trendSummary).toContain('First recorded test');
    });

    test('handles undefined / empty objects safely', () => {
      const trend = calculateSoilTrend({}, {});
      expect(trend.hasComparison).toBe(true);
      expect(trend.scoreDelta).toBe(0);
      expect(trend.trendStatus).toBe('stable');
    });
  });

  describe('Score Delta & Trend Status Classification', () => {
    test('classifies improving soil health when score increases by more than 3 points', () => {
      const current = {
        result: { score: 88 },
        inputs: { n: 320, p: 22, k: 210, ph: 6.8 },
      };
      const previous = {
        id: '123',
        timestamp: '2026-09-01T10:00:00Z',
        result: { score: 75 },
        inputs: { n: 240, p: 15, k: 180, ph: 6.2 },
      };

      const trend = calculateSoilTrend(current, previous);
      expect(trend.hasComparison).toBe(true);
      expect(trend.scoreDelta).toBe(13);
      expect(trend.currScore).toBe(88);
      expect(trend.prevScore).toBe(75);
      expect(trend.trendStatus).toBe('improving');
      expect(trend.trendSummary).toContain('13 points higher');
    });

    test('classifies needs_attention when score drops by more than 3 points', () => {
      const current = {
        result: { score: 60 },
        inputs: { n: 180, p: 8, k: 110, ph: 5.5 },
      };
      const previous = {
        id: '123',
        timestamp: '2026-09-01T10:00:00Z',
        result: { score: 80 },
        inputs: { n: 300, p: 20, k: 200, ph: 6.5 },
      };

      const trend = calculateSoilTrend(current, previous);
      expect(trend.scoreDelta).toBe(-20);
      expect(trend.trendStatus).toBe('needs_attention');
      expect(trend.trendSummary).toContain('20 points lower');
    });

    test('classifies stable when score change is within [-3, 3] points', () => {
      const current = {
        result: { score: 82 },
        inputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      };
      const previous = {
        result: { score: 80 },
        inputs: { n: 290, p: 19, k: 195, ph: 6.7 },
      };

      const trend = calculateSoilTrend(current, previous);
      expect(trend.scoreDelta).toBe(2);
      expect(trend.trendStatus).toBe('stable');
      expect(trend.trendSummary).toContain('consistent with your previous recorded test');
    });
  });

  describe('Nutrient Delta Calculations', () => {
    test('computes precise nutrient changes and directions', () => {
      const current = {
        result: { score: 85 },
        inputs: { n: 350, p: 18, k: 200, ph: 7.2 },
      };
      const previous = {
        result: { score: 80 },
        inputs: { n: 300, p: 20, k: 200, ph: 6.5 },
      };

      const trend = calculateSoilTrend(current, previous);
      const [nChange, pChange, kChange, phChange] = trend.nutrientChanges;

      expect(nChange.key).toBe('n');
      expect(nChange.delta).toBe(50);
      expect(nChange.direction).toBe('up');

      expect(pChange.key).toBe('p');
      expect(pChange.delta).toBe(-2);
      expect(pChange.direction).toBe('down');

      expect(kChange.key).toBe('k');
      expect(kChange.delta).toBe(0);
      expect(kChange.direction).toBe('same');

      expect(phChange.key).toBe('ph');
      expect(phChange.delta).toBe(0.7);
      expect(phChange.direction).toBe('up');
    });
  });

  describe('Legacy Record Compatibility', () => {
    test('handles legacy record without context or Phase 1 metadata', () => {
      const current = {
        result: { score: 85 },
        inputs: { n: 300, p: 20, k: 200, ph: 6.8 },
      };
      // Legacy item from Phase 0
      const legacyItem = {
        score: 70, // In legacy items, score was sometimes flat or inside result
        inputs: { n: 250, p: 15, k: 150, ph: 6.0 },
      };

      const trend = calculateSoilTrend(current, legacyItem);
      expect(trend.hasComparison).toBe(true);
      expect(trend.currScore).toBe(85);
      expect(trend.nutrientChanges).toHaveLength(4);
    });
  });
});
