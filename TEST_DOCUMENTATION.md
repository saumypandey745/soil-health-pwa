# Backend & Soil Intelligence Test Documentation

This document describes the automated test suite for the Soil Health PWA backend logic, API routes, and Phase 1 Advanced Soil Intelligence.

---

## 1. Overview & What is Tested

The test suite covers 7 key areas across **80 individual unit and integration tests**:

1. **`lib/soilLogic.js` (`__tests__/soilLogic.test.js`) — 16 Tests**:
   - Baseline agronomic calculation logic (`analyzeSoil`).
   - Boundary value testing (healthy, moderate deficiency, severe deficiency at <60% threshold, excess nitrogen).
   - Soil pH extremes (acidic and alkaline).
   - Fallback crop compatibility logic (millets, pulses) and recommendation bounds (2–5 crops).
   - Edge cases (all zeros, negative inputs, out-of-bound ranges) ensuring resilience and score containment (0–100).

2. **`lib/soilLogic.js` (`__tests__/soilIntelligence.test.js`) — 20 Tests**:
   - Granular pH classification (`classifyPh`: Strongly Acidic, Acidic, Slightly Acidic, Neutral, Slightly Alkaline, Moderately Alkaline, Strongly Alkaline).
   - Soil Health Grade mapping (`calculateHealthGrade`: A, B, C, D, E).
   - Deterministic Limiting Factor detection (`determineLimitingFactor`: severity-based ranking, relative deficit ratios, and deterministic tie-breaker).
   - Normalized nutrient attributes (`current`, `status`, `severity`, `optimalRange`, `unit`, `label`).
   - Safe Action Model compliance (actionPlan has valid types, priorities, and disclaimers without hardcoded universal prescriptions).
   - Crop recommendations metadata (rule-based suitability percentages, considerations, and reasons).
   - Seasonal crop segmentation (`kharif`, `rabi`, `zaid`).
   - Positive soil strengths detection for healthy parameters.
   - Structured farmer action summaries (`priority`, `urgent`, `longTerm`).

3. **`lib/farmContext.js` (`__tests__/farmContext.test.js`) — 8 Tests (Phase 2)**:
   - Input sanitization and defaults handling (null, undefined, non-objects).
   - Case-insensitive season normalization with whitespace trimming (`kharif`, `rabi`, `zaid`).
   - Water availability normalization (`rainfed`, `limited`, `reliable`).
   - Location parsing (state, district, village) and `hasContext` flag determination.
   - Crop preference, current crop, and rotation history sanitization.

4. **`lib/cropRanking.js` (`__tests__/cropRanking.test.js`) — 6 Tests (Phase 2)**:
   - Water availability modifiers (drought-hardy crops boosted under rainfed, water-intensive crops penalized under rainfed / boosted under reliable irrigation).
   - Season compatibility modifiers (in-season sowing windows boosted, out-of-season flagged with considerations).
   - Farmer preferred crop detection and suitability boosting.
   - Legume rotation bonuses following cereal crops and monocropping cautions.
   - Multi-metric crop comparison matrix generation (`buildCropComparison`).

5. **`lib/historyLogic.js` (`__tests__/historyLogic.test.js`) — 6 Tests (Phase 2)**:
   - Safe fallback when no prior test record exists.
   - Soil health score delta computation and trend categorization (`improving`, `needs_attention`, `stable`).
   - Individual nutrient delta calculations with directional indicators (`up`, `down`, `same`).
   - Backward compatibility with legacy history records lacking Phase 1/Phase 2 schema fields.

6. **`pages/api/analyze.js` (`__tests__/api.analyze.test.js`) — 11 Tests**:
   - HTTP method validation (POST allowed; GET/PUT rejected with 405).
   - Request body validation (empty body, missing fields, non-numeric values returning 400).
   - Type coercion (numeric string inputs coerced cleanly to numbers).
   - Extreme large values handling returning valid 200 responses.
   - Farm context support (optional `context` object processed returning `farmContext` and `cropComparison`).
   - Stringified JSON body support and malformed JSON error handling.

7. **`pages/api/tts.js` (`__tests__/api.tts.test.js`) — 8 Tests**:
   - Method enforcement (POST allowed; GET rejected with 405).
   - Environment variable validation (`SARVAM_API_KEY` presence check returning 400 if unconfigured).
   - Request payload validation (missing/empty text, unsupported language codes returning 400).
   - Text truncation (inputs longer than 2,500 characters safely sliced).
   - Upstream API communication (contract verification against `https://api.sarvam.ai/text-to-speech` with `api-subscription-key`, `model: "bulbul:v3"`, `speaker: "shubh"`, and correct BCP-47 locale tags `en-IN`, `hi-IN`, `kn-IN`).
   - Error masking and fault tolerance (upstream 5xx/4xx mapped to 502 without leaking keys or raw error bodies; network timeouts and exceptions mapped to 500).
   - Binary response encoding (base64 audio payload decoded into `audio/wav` Buffer with status 200).

> **Note on Sarvam AI Mocking**: In all test suites, Sarvam AI network calls are completely mocked using `global.fetch` mocks. **No real API key or internet access is required to run the test suite.**

---

## 2. How to Run the Tests

To execute the test suite, run:

```bash
npm test
```

For verbose output with individual test names:

```bash
npx jest --verbose
```

For coverage report:

```bash
npx jest --coverage
```

---

## 3. Test Cases & Expected Results

### Suite 1: `__tests__/soilLogic.test.js`

| # | Test Case Description | Input | Expected Result |
|---|------------------------|-------|-----------------|
| 1 | Healthy case | `{ n: 350, p: 18, k: 200, ph: 6.8 }` | Score 100, overall `'healthy'`, 0 deficiencies, recommended crops returned |
| 2 | Severe N deficiency (<60% threshold) | `{ n: 100, p: 18, k: 200, ph: 6.8 }` | Deficiencies contain `{ nutrient: 'Nitrogen (N)', status: 'severe' }` |
| 3 | Severe P deficiency (<60% threshold) | `{ n: 350, p: 4, k: 200, ph: 6.8 }` | Deficiencies contain `{ nutrient: 'Phosphorus (P)', status: 'severe' }` |
| 4 | Severe K deficiency (<60% threshold) | `{ n: 350, p: 18, k: 50, ph: 6.8 }` | Deficiencies contain `{ nutrient: 'Potassium (K)', status: 'severe' }` |
| 5 | Moderate deficiency for single low nutrient | `{ n: 200, p: 18, k: 200, ph: 6.8 }` | Deficiencies contain `{ nutrient: 'Nitrogen (N)', status: 'moderate' }`, score 90 |
| 6 | Excess nitrogen flagged moderate | `{ n: 600, p: 18, k: 200, ph: 6.8 }` | Deficiencies contain `{ nutrient: 'Nitrogen (N)', status: 'moderate' }` |
| 7 | pH too acidic | `{ n: 350, p: 18, k: 200, ph: 5.0 }` | Deficiencies contain `{ nutrient: 'pH balance', status: 'moderate' }` |
| 8 | pH too alkaline | `{ n: 350, p: 18, k: 200, ph: 8.5 }` | Deficiencies contain `{ nutrient: 'pH balance', status: 'moderate' }` |
| 9 | Boundary exactly at low threshold | `{ n: 280, p: 10, k: 120, ph: 6.0 }` | Score 100, overall `'healthy'`, 0 deficiencies |
| 10 | Just below threshold | `{ n: 279, p: 10, k: 120, ph: 6.0 }` | Deficiencies contain `{ nutrient: 'Nitrogen (N)', status: 'moderate' }` |
| 11 | Below 60% of threshold | `{ n: 167, p: 10, k: 120, ph: 6.0 }` | Deficiencies contain `{ nutrient: 'Nitrogen (N)', status: 'severe' }` |
| 12 | All-zero input | `{ n: 0, p: 0, k: 0, ph: 0 }` | Does not throw, score 25, overall `'severe'`, 4 severe deficiencies |
| 13 | Fallback crops when nothing matches | `{ n: 0, p: 0, k: 0, ph: 0 }` | Recommended crops equal `['Millets', 'Pulses (Dal)']` |
| 14 | Strong profile returns 2 to 5 crops | `{ n: 350, p: 22, k: 220, ph: 6.5 }` | Recommended crops count is between 2 and 5 |
| 15 | Score bounded within 0–100 | Range of extreme values | Score is >= 0 and <= 100 for all inputs |
| 16 | Negative inputs do not throw | `{ n: -10, p: -5, k: -20, ph: -1 }` | Does not throw; returns valid result object |

### Suite 2: `__tests__/soilIntelligence.test.js` (Phase 1 Intelligence)

| # | Test Case Description | Input / Function | Expected Result |
|---|------------------------|------------------|-----------------|
| 1 | pH < 5.0 | `classifyPh(4.5)` | Returns `'Strongly Acidic'` |
| 2 | 5.0 <= pH < 6.0 | `classifyPh(5.5)` | Returns `'Acidic'` |
| 3 | 6.0 <= pH < 6.5 | `classifyPh(6.2)` | Returns `'Slightly Acidic'` |
| 4 | 6.5 <= pH <= 7.5 | `classifyPh(7.0)` | Returns `'Neutral'` |
| 5 | 7.5 < pH <= 8.0 | `classifyPh(7.8)` | Returns `'Slightly Alkaline'` |
| 6 | 8.0 < pH <= 8.5 | `classifyPh(8.3)` | Returns `'Moderately Alkaline'` |
| 7 | pH > 8.5 | `classifyPh(9.0)` | Returns `'Strongly Alkaline'` |
| 8 | Grade calculation (A) | `calculateHealthGrade(95)` | Returns `'A'` |
| 9 | Grade calculation (B) | `calculateHealthGrade(85)` | Returns `'B'` |
| 10 | Grade calculation (C) | `calculateHealthGrade(75)` | Returns `'C'` |
| 11 | Grade calculation (D) | `calculateHealthGrade(55)` | Returns `'D'` |
| 12 | Grade calculation (E) | `calculateHealthGrade(30)` | Returns `'E'` |
| 13 | Limiting factor (Healthy) | All parameters healthy | Returns `'None'` |
| 14 | Limiting factor (N) | Sole severe N | Returns `'Nitrogen'` |
| 15 | Limiting factor (P) | Sole severe P | Returns `'Phosphorus'` |
| 16 | Limiting factor (K) | Sole severe K | Returns `'Potassium'` |
| 17 | Limiting factor (Tie break) | All parameters zero | Deterministically selects `'Nitrogen'` via hierarchy |
| 18 | Result Contract Integrity | `analyzeSoil()` execution | Exposes `nutrients`, `soilClassification`, `strengths`, `cropRecommendations`, `seasonalCrops`, `farmerActionSummary`, `actionPlan` |
| 19 | Safe Action Model | `actionPlan` validation | Disclaimers present, zero hardcoded universal prescriptions (e.g. no "40-50 kg/acre Urea") |
| 20 | Crop Suitability & Reasons | `cropRecommendations` | Rule-based percentage bounded 50–100 with clear suitability estimate disclaimers |

### Suite 3: `__tests__/api.analyze.test.js`

| # | Test Case Description | Request | Expected Result |
|---|------------------------|---------|-----------------|
| 1 | Valid POST analysis | `POST /api/analyze` with `{ n: 300, p: 20, k: 150, ph: 6.5 }` | Status 200 with `score`, `overall`, `deficiencies`, `recommendedCrops` |
| 2 | Reject GET | `GET /api/analyze` | Status 405 Method Not Allowed |
| 3 | Reject PUT | `PUT /api/analyze` | Status 405 Method Not Allowed |
| 4 | Missing required field | `POST /api/analyze` with missing `ph` | Status 400 with `{ error: 'Invalid NPK/pH values' }` |
| 5 | Non-numeric string | `POST /api/analyze` with `{ n: 'abc', ... }` | Status 400 with `{ error: 'Invalid NPK/pH values' }` |
| 6 | Empty body | `POST /api/analyze` with `{}` | Status 400 with `{ error: 'Invalid NPK/pH values' }` |
| 7 | Coerce numeric strings | `POST /api/analyze` with `{ n: '300', p: '20', ... }` | Status 200, parsed as numbers, valid analysis returned |
| 8 | Extreme large values | `POST /api/analyze` with large values | Status 200 with valid analysis returned |
| 9 | Optional context integration | `POST /api/analyze` with `context` object | Status 200, returns `farmContext` and `cropComparison` array |
| 10 | Stringified JSON body support | `POST /api/analyze` with JSON string payload | Status 200, parsed safely |
| 11 | Malformed JSON string | `POST /api/analyze` with malformed JSON string | Status 400 with `{ error: 'Invalid JSON body' }` |

### Suite 4: `__tests__/api.tts.test.js`

| # | Test Case Description | Request / Mock State | Expected Result |
|---|------------------------|----------------------|-----------------|
| 1 | Missing `SARVAM_API_KEY` | `SARVAM_API_KEY` unset | Status 400 with `{ error: 'SARVAM_API_KEY not configured' }`, fetch not called |
| 2 | Reject GET | `GET /api/tts` | Status 405 Method Not Allowed, fetch not called |
| 3 | Missing/empty text | `POST /api/tts` with empty text `""` | Status 400 with `{ error: 'Missing or empty text' }`, fetch not called |
| 4 | Unsupported language | `POST /api/tts` with `lang: "fr"` | Status 400 with `{ error: 'Unsupported language' }`, fetch not called |
| 5 | Upstream non-OK | Mock upstream response `ok: false` | Status 502 with `{ error: 'Sarvam AI request failed' }` (no key/upstream body leaked) |
| 6 | Network error / rejection | Mock fetch throws error | Status 500 with `{ error: 'TTS generation failed' }` |
| 7 | Successful TTS generation | Mock 200 with base64 audio | Status 200, `Content-Type: audio/wav`, decoded bytes returned; fetch called with `https://api.sarvam.ai/text-to-speech`, header `'api-subscription-key'`, body containing `text`, `language_code: 'hi-IN'`, `model: 'bulbul:v3'`, `speaker: 'shubh'` |
| 8 | Truncation > 2500 characters | Payload text of 3,600 characters | Status 200, fetch called with payload text truncated to exactly 2,500 characters |

### Suite 5: `__tests__/farmContext.test.js` (Phase 2 Farm Context Engine)

| # | Test Case Description | Input / Function | Expected Result |
|---|------------------------|------------------|-----------------|
| 1 | Safe defaults on empty call | `buildFarmContext()` | Returns default structure, `hasContext: false` |
| 2 | Resilient to null/primitives | `buildFarmContext(null / 12345 / 'string')` | Returns default structure without throwing |
| 3 | Case-insensitive season parsing | `buildFarmContext({ season: '  RABI  ' })` | Normalizes to `'rabi'` |
| 4 | Discard invalid season | `buildFarmContext({ season: 'summer' })` | Normalizes to `''` |
| 5 | Water availability variations | `buildFarmContext({ waterAvailability: 'Rain-Fed' })` | Normalizes to `'rainfed'` |
| 6 | Reliable irrigation normalization | `buildFarmContext({ waterAvailability: 'assured' })` | Normalizes to `'reliable'` |
| 7 | Trimmed location parsing | `buildFarmContext({ location: { state: '  Karnataka  ', ... } })` | Strips whitespace, `hasContext: true` |
| 8 | Crop preference & rotation strings | `buildFarmContext({ preferredCrop: '  Wheat  ', ... })` | Strips whitespace, stores sanitized strings |

### Suite 6: `__tests__/cropRanking.test.js` (Phase 2 Crop Ranking)

| # | Test Case Description | Input / Function | Expected Result |
|---|------------------------|------------------|-----------------|
| 1 | Rainfed water sensitivity | `rankCropsWithContext({ waterAvailability: 'rainfed' })` | Millets boosted (`waterFit: 'High'`), Rice penalized (`waterFit: 'Low'`) |
| 2 | Reliable irrigation support | `rankCropsWithContext({ waterAvailability: 'reliable' })` | Rice receives irrigation reason and high water fit |
| 3 | Season compatibility | `rankCropsWithContext({ season: 'kharif' })` | Rice (Kharif) fit 'High', Wheat (Rabi) flagged with caution |
| 4 | Preferred crop boost | `rankCropsWithContext({ preferredCrop: 'Wheat' })` | Wheat marked `isPreferred: true` with boost |
| 5 | Legume crop rotation bonus | `rankCropsWithContext({ previousCrop: 'Rice' })` | Pulses (Dal) receives rotation benefit explanation |
| 6 | Comparison matrix generation | `buildCropComparison(ranked)` | Returns top 4 crops with 3-dimensional fit tags and pros/cons |

### Suite 7: `__tests__/historyLogic.test.js` (Phase 2 Soil Trend Engine)

| # | Test Case Description | Input / Function | Expected Result |
|---|------------------------|------------------|-----------------|
| 1 | First recorded test fallback | `calculateSoilTrend(current, null)` | `hasComparison: false`, status `'stable'`, informative summary |
| 2 | Empty objects resilience | `calculateSoilTrend({}, {})` | Computes safely without throwing |
| 3 | Improving soil health trend | Score change > +3 | Status `'improving'`, positive delta and summary |
| 4 | Needs attention soil health trend | Score change < -3 | Status `'needs_attention'`, negative delta and alert summary |
| 5 | Stable soil health trend | Score change between -3 and +3 | Status `'stable'`, consistent summary |
| 6 | Nutrient delta calculations | N/P/K/pH changes | Accurately calculates delta values and directions (`up`, `down`, `same`) |

