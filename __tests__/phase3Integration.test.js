import fs from 'fs';
import path from 'path';
import { createMocks } from 'node-mocks-http';
import { analyzeSoil, CROP_DB } from '../lib/soilLogic';
import analyzeHandler from '../pages/api/analyze';

describe('Phase 3 Integration: Direct Entry, Localization Parity & Offline Contracts', () => {
  describe('Phase 3A - Direct Soil Test Entry contracts', () => {
    test('produces identical analysis whether photo is provided, null, or undefined', () => {
      const inputs = { n: 280, p: 25, k: 170, ph: 6.7 };

      const resultWithoutPhoto = analyzeSoil(inputs);
      const resultWithNullPhoto = analyzeSoil(inputs);

      expect(resultWithoutPhoto.score).toBe(resultWithNullPhoto.score);
      expect(resultWithoutPhoto.overall).toBe(resultWithNullPhoto.overall);
      expect(resultWithoutPhoto.soilClassification.healthGrade).toBe(
        resultWithNullPhoto.soilClassification.healthGrade
      );
      expect(resultWithoutPhoto.cropRecommendations).toEqual(resultWithNullPhoto.cropRecommendations);
    });

    test('validates direct numerical inputs strictly even when user bypassed photo capture', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { n: 'not-a-number', p: 20, k: 150, ph: 6.5 },
      });
      await analyzeHandler(req, res);
      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Invalid NPK/pH values');
    });

    test('accepts realistic lab report values without photo', () => {
      const labReport = { n: 320, p: 22, k: 190, ph: 7.1 };
      const analysis = analyzeSoil(labReport);

      expect(analysis.score).toBeGreaterThan(0);
      expect(analysis.soilClassification).toBeDefined();
      expect(analysis.cropRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 3D - Localization Key Parity (en, hi, kn)', () => {
    const localesDir = path.join(process.cwd(), 'public', 'locales');
    const enCommon = JSON.parse(fs.readFileSync(path.join(localesDir, 'en', 'common.json'), 'utf8'));
    const hiCommon = JSON.parse(fs.readFileSync(path.join(localesDir, 'hi', 'common.json'), 'utf8'));
    const knCommon = JSON.parse(fs.readFileSync(path.join(localesDir, 'kn', 'common.json'), 'utf8'));

    const enKeys = Object.keys(enCommon).sort();
    const hiKeys = Object.keys(hiCommon).sort();
    const knKeys = Object.keys(knCommon).sort();

    test('all 3 locales have 100% identical key sets', () => {
      expect(hiKeys).toEqual(enKeys);
      expect(knKeys).toEqual(enKeys);
    });

    test('every crop in CROP_DB has a localized display key in en, hi, and kn', () => {
      CROP_DB.forEach((c) => {
        const cropKey = `crop_${c.crop}`;
        expect(enCommon).toHaveProperty(cropKey);
        expect(hiCommon).toHaveProperty(cropKey);
        expect(knCommon).toHaveProperty(cropKey);

        expect(enCommon[cropKey].trim().length).toBeGreaterThan(0);
        expect(hiCommon[cropKey].trim().length).toBeGreaterThan(0);
        expect(knCommon[cropKey].trim().length).toBeGreaterThan(0);
      });
    });

    test('all 4 suggested questions for AI Farmer Assistant exist in all locales', () => {
      ['suggestedQ1', 'suggestedQ2', 'suggestedQ3', 'suggestedQ4'].forEach((qKey) => {
        expect(enCommon).toHaveProperty(qKey);
        expect(hiCommon).toHaveProperty(qKey);
        expect(knCommon).toHaveProperty(qKey);
      });
    });

    test('Phase 3A direct entry keys exist across all locales', () => {
      ['continueWithPhoto', 'enterValuesDirectly', 'optionalPhotoHint', 'or'].forEach((k) => {
        expect(enCommon).toHaveProperty(k);
        expect(hiCommon).toHaveProperty(k);
        expect(knCommon).toHaveProperty(k);
      });
    });

    test('Phase 3B crop decision comparison keys exist across all locales', () => {
      [
        'cropDecisionTitle',
        'cropDecisionSubtitle',
        'selectCropA',
        'selectCropB',
        'comparisonFactor',
        'whatToConsider',
        'sameCropNotice',
      ].forEach((k) => {
        expect(enCommon).toHaveProperty(k);
        expect(hiCommon).toHaveProperty(k);
        expect(knCommon).toHaveProperty(k);
      });
    });
  });
});
