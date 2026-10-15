# AI-Based Soil Health Assessment System for Nutrient Deficiency Detection and Crop Recommendation (Soil Health Advisor PWA)

A mobile-friendly, installable Progressive Web App (PWA) built with Next.js 14 (Pages Router) for smallholder farmers. The application allows farmers to capture a soil photo or enter NPK/pH values directly, receive an instant agronomic soil health diagnosis with crop suitability rankings, listen to advisory in regional languages (English, Hindi, Kannada), consult an interactive AI assistant, and download a client-side PDF report.

---

## 1. System Architecture & Flow

The application is structured into four main operational stages:

1. **Input Stage**: Soil photo capture via the HTML5 Camera API (`PhotoCapture.js`) or direct numeric entry (`SoilForm.js`). An offline history drawer allows reviewing past tests saved in `localStorage`.
2. **Farm Context Profiling (Optional)**: Captures seasonal window (Kharif, Rabi, Zaid), water source (rainfed, limited, reliable irrigation), location details, and previous/preferred crops (`FarmContextForm.js`).
3. **Agronomic Evaluation**: Evaluates soil parameters against standard agronomic threshold bands (`soilLogic.js`), assigns an overall score (0–100), health grade (A–E), pH classification, and limiting factor. Ranks crop suitability taking into account soil fit, water availability, and seasonal windows (`cropRanking.js`).
4. **Advisory & Output**: Displays nutrient status indicators, strengths, deficiencies, pairwise crop comparisons (`CropDecisionAssistant.js`), action plans, conversational AI assistance (`FarmerAssistant.js`), audio playback (`sarvam.js`), and PDF export (`pdfReport.js`).

---

## 2. Project Directory Structure

```
.
├── pages/
│   ├── _app.js                   # Application wrapper & next-i18next provider
│   ├── _document.js              # HTML skeleton, PWA meta tags, and mobile headers
│   ├── index.js                  # Main controller handling multi-step workflow & state
│   └── api/
│       ├── analyze.js            # Server API endpoint executing pure agronomic analysis
│       ├── assistant.js          # Server proxy for Gemini API with expert engine fallback
│       └── tts.js                # Server proxy for Sarvam AI Text-to-Speech API
├── components/
│   ├── CropDecisionAssistant.js  # Head-to-head comparison tool for two selected crops
│   ├── ErrorBoundary.js          # React error boundary component for UI crash prevention
│   ├── FarmContextForm.js        # Form for season, water availability, and crop history
│   ├── FarmerAssistant.js        # Chat interface with AI & offline rule fallback
│   ├── PhotoCapture.js           # MediaDevices camera streaming and snapshot capture
│   ├── ResultsCard.js            # Primary results dashboard and advisory layout
│   └── SoilForm.js               # NPK and pH numeric input form
├── lib/
│   ├── assistantEngine.js        # Deterministic rule-based agronomy reasoning engine
│   ├── cropRanking.js            # Weighted crop suitability and pairwise evaluation
│   ├── farmContext.js            # Input normalizer and sanitizer for farm profiles
│   ├── historyLogic.js           # Multi-test comparison and progress trend tracker
│   ├── pdfReport.js              # Client-side multi-page PDF generation via jsPDF
│   ├── sarvam.js                 # Client audio wrapper with SpeechSynthesis fallback
│   └── soilLogic.js              # Core agronomic thresholds, scoring, and classification
├── public/
│   ├── icons/                    # App icons for manifest and home screen installation
│   ├── locales/                  # Internationalization JSON strings
│   │   ├── en/common.json        # English translations (123 keys)
│   │   ├── hi/common.json        # Hindi translations (123 keys)
│   │   └── kn/common.json        # Kannada translations (123 keys)
│   └── manifest.json             # Web App Manifest for PWA installation
├── styles/
│   └── globals.css               # Vanilla CSS design system with mobile tap targets
├── __tests__/                    # Automated test suites (11 suites, 111 tests)
├── next.config.js                # Next.js configuration with next-pwa and security headers
├── next-i18next.config.js        # Locale routing configuration (en, hi, kn)
└── package.json                  # Dependencies and execution scripts
```

---

## 3. Environment Variables

All API keys are strictly server-side and never exposed to the client bundle.

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Contents of `.env.local.example`:

```ini
SARVAM_API_KEY=your_sarvam_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### Supported Variables:
- `SARVAM_API_KEY`: Required server-side in `pages/api/tts.js` to communicate with the Sarvam AI Text-to-Speech API.
- `GEMINI_API_KEY`: Server-side only in `pages/api/assistant.js` to query Google Gemini for farmer assistant responses.
- `GEMINI_MODEL`: (Optional) Overrides the default model in `pages/api/assistant.js`. Defaults to `gemini-3.5-flash-lite`.

> **Netlify Deployment Note**: For production on Netlify, set `SARVAM_API_KEY`, `GEMINI_API_KEY`, and optional `GEMINI_MODEL` under **Site settings > Environment variables**, then trigger a redeploy.

---

## 4. Setup, Test, Build, and Run

### Installation
```bash
npm install
```

### Local Development
```bash
npm run dev
```
Accessible at `http://localhost:3000`.

### Running Tests
The test suite runs with Jest and Babel:
```bash
npm test
```
Current automated test output:
```text
Test Suites: 11 passed, 11 total
Tests:       111 passed, 111 total
Snapshots:   0 total
```

### Production Build & PWA Testing
```bash
npm run build
npm run start
```
`next build` produces an optimized production build with the service worker compiled into `public/sw.js` and outputs:
```text
✓ Compiled successfully
```

---

## 5. Known Limitations

- **Rule-Based Scoring (No ML Model Connection)**: Soil health scoring, nutrient deficiency detection, health grade calculation, limiting factor identification, and crop recommendations are driven by deterministic agronomic rules and thresholds in `lib/soilLogic.js` and `lib/cropRanking.js`. The FastAPI ML service (`/analyze`) is not connected to or invoked by this application.
- **Offline vs Online Capabilities**:
  - *Fully functional offline*: The application shell (via `next-pwa` service worker), input entry, client-side soil analysis (`analyzeSoil`), crop decision comparisons, test history reading/saving (`localStorage`), multi-page PDF generation (`jsPDF`), browser speech synthesis fallback (`window.speechSynthesis`), and the deterministic agronomy assistant fallback (`assistantEngine.js`).
  - *Requires internet connection*: Cloud Sarvam AI Text-to-Speech generation (`/api/tts` calling `https://api.sarvam.ai/text-to-speech`), Google Gemini AI responses (`/api/assistant` calling `https://generativelanguage.googleapis.com`), and external requests to the HTTP endpoint `/api/analyze`.
- **Cloud API Verification**:
  - Real Sarvam AI voice generation was verified live with an active API key using model `bulbul:v3` and speaker `shubh`, successfully returning 200 with audio WAV payloads.
  - Real Google Gemini API connectivity was verified live with model `gemini-3.5-flash-lite`, returning status 200.
  - When keys are missing or network calls fail, the client gracefully falls back to browser `SpeechSynthesis` and local deterministic agronomic reasoning.
