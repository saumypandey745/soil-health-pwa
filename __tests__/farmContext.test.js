import { buildFarmContext, VALID_SEASONS, VALID_WATER_LEVELS } from '../lib/farmContext';

describe('Phase 2 - Farm Context Engine (lib/farmContext.js)', () => {
  describe('Input Sanitization & Defaults', () => {
    test('returns default safe empty context when called with no arguments', () => {
      const ctx = buildFarmContext();
      expect(ctx).toEqual({
        location: { state: '', district: '', village: '' },
        season: '',
        waterAvailability: '',
        currentCrop: '',
        previousCrop: '',
        preferredCrop: '',
        hasContext: false,
      });
    });

    test('handles null, undefined, and non-object inputs gracefully', () => {
      expect(buildFarmContext(null).hasContext).toBe(false);
      expect(buildFarmContext(undefined).hasContext).toBe(false);
      expect(buildFarmContext('string-input').hasContext).toBe(false);
      expect(buildFarmContext(12345).hasContext).toBe(false);
    });
  });

  describe('Season Normalization', () => {
    test('accepts valid seasons case-insensitively with trimming', () => {
      expect(buildFarmContext({ season: 'kharif' }).season).toBe('kharif');
      expect(buildFarmContext({ season: '  RABI  ' }).season).toBe('rabi');
      expect(buildFarmContext({ season: 'Zaid' }).season).toBe('zaid');
    });

    test('discards invalid season strings', () => {
      expect(buildFarmContext({ season: 'summer' }).season).toBe('');
      expect(buildFarmContext({ season: 'monsoon' }).season).toBe('');
      expect(buildFarmContext({ season: 123 }).season).toBe('');
    });
  });

  describe('Water Availability Normalization', () => {
    test('normalizes rainfed variations', () => {
      expect(buildFarmContext({ waterAvailability: 'rainfed' }).waterAvailability).toBe('rainfed');
      expect(buildFarmContext({ waterAvailability: 'Rain-Fed' }).waterAvailability).toBe('rainfed');
      expect(buildFarmContext({ waterAvailability: 'rain' }).waterAvailability).toBe('rainfed');
    });

    test('normalizes limited variations', () => {
      expect(buildFarmContext({ waterAvailability: 'limited' }).waterAvailability).toBe('limited');
      expect(buildFarmContext({ waterAvailability: 'Limited Irrigation' }).waterAvailability).toBe('limited');
    });

    test('normalizes reliable / assured / irrigated variations', () => {
      expect(buildFarmContext({ waterAvailability: 'reliable' }).waterAvailability).toBe('reliable');
      expect(buildFarmContext({ waterAvailability: 'assured' }).waterAvailability).toBe('reliable');
      expect(buildFarmContext({ waterAvailability: 'irrigated' }).waterAvailability).toBe('reliable');
    });

    test('rejects unsupported water availability values', () => {
      expect(buildFarmContext({ waterAvailability: 'ocean' }).waterAvailability).toBe('');
      expect(buildFarmContext({ waterAvailability: null }).waterAvailability).toBe('');
    });
  });

  describe('Location & Crop Fields', () => {
    test('normalizes location fields and trims whitespace', () => {
      const ctx = buildFarmContext({
        location: {
          state: '  Karnataka  ',
          district: 'Dharwad ',
          village: ' Narendra',
        },
      });

      expect(ctx.location.state).toBe('Karnataka');
      expect(ctx.location.district).toBe('Dharwad');
      expect(ctx.location.village).toBe('Narendra');
      expect(ctx.hasContext).toBe(true);
    });

    test('handles partial location objects safely', () => {
      const ctx = buildFarmContext({
        location: { district: 'Belagavi' },
      });
      expect(ctx.location.state).toBe('');
      expect(ctx.location.district).toBe('Belagavi');
      expect(ctx.location.village).toBe('');
      expect(ctx.hasContext).toBe(true);
    });

    test('truncates location fields to a maximum of 50 characters', () => {
      const veryLongString = 'A'.repeat(80);
      const ctx = buildFarmContext({
        location: {
          state: veryLongString,
          district: veryLongString,
          village: veryLongString,
        },
      });

      expect(ctx.location.state).toHaveLength(50);
      expect(ctx.location.district).toHaveLength(50);
      expect(ctx.location.village).toHaveLength(50);
    });

    test('normalizes crop preference and history strings', () => {
      const ctx = buildFarmContext({
        preferredCrop: '  Wheat  ',
        currentCrop: ' Rice ',
        previousCrop: 'Fallow',
      });

      expect(ctx.preferredCrop).toBe('Wheat');
      expect(ctx.currentCrop).toBe('Rice');
      expect(ctx.previousCrop).toBe('Fallow');
      expect(ctx.hasContext).toBe(true);
    });
  });
});

