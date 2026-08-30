# Soil Health Advisor — Farmer-Facing PWA (Milestone 3, Task 2)

A mobile-friendly, installable Progressive Web App that lets a farmer capture a soil
photo, enter NPK/pH values, get an instant soil health diagnosis with crop
recommendations, hear the results read aloud in their regional language, and
download a PDF report.

## 1. Setup & Installation

```bash
npm install
npm run dev        # local dev server at http://localhost:3000
```

Production build (required before deployment/PWA testing):
```bash
npm run build
npm run start
```

## 2. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```
SARVAM_API_KEY=your_key_here            # used server-side in pages/api/tts.js
NEXT_PUBLIC_SARVAM_API_KEY=your_key_here # used client-side to decide whether to call Sarvam or fallback
```

**No Sarvam key yet?** The app still works. `lib/sarvam.js` automatically falls
back to the browser's built-in `SpeechSynthesis` API, so the "Listen to Results"
voice feature is fully demoable without any key. Add the real key later and it
switches to Sarvam AI automatically — no code change needed.

## 3. Key Implementation Decisions

- **Pages Router (not App Router)**: chosen because `next-pwa` and
  `next-i18next` have first-class, well-documented support for the Pages
  Router, which reduces integration risk under a tight deadline.
- **PWA installability**: `next-pwa` auto-generates the service worker at
  build time; `public/manifest.json` + icons + `_document.js` meta tags make
  the app installable on Android Chrome via "Add to Home Screen" — no app
  store needed. Service worker is disabled in dev mode to avoid caching
  issues while developing.
- **Localization**: `next-i18next` with locale-based routing
  (`en` / `hi` / `kn`). All static UI strings live in
  `public/locales/<lang>/common.json`. Adding a new language later only
  requires a new JSON file + entry in `next-i18next.config.js`.
- **Soil scoring logic**: kept in `lib/soilLogic.js` as a pure function
  (`analyzeSoil`) using standard agronomic NPK/pH threshold bands and a
  small crop-compatibility lookup table, so it's easy to swap in a real ML
  model later (e.g., call the FastAPI `/analyze` endpoint from the earlier
  Milestone 3 deliverable instead of the local heuristic).
- **Voice (Sarvam AI)**: server route (`pages/api/tts.js`) keeps the API key
  off the client. Client wrapper (`lib/sarvam.js`) gracefully degrades to
  on-device `SpeechSynthesis` when no key is configured.
- **PDF report**: generated fully client-side with `jsPDF` (no server round
  trip needed), so it works even offline once the app shell is cached.
- **Low-end device performance**: no UI framework/heavy CSS library; plain
  CSS with large tap targets and minimal JS bundle size.

## 4. Testing PWA Install & Camera on an Android Device

1. Deploy the build (e.g. `vercel deploy` or serve `npm run build && npm run start`
   behind a tunnel like `ngrok`) so it's reachable over HTTPS — camera API and
   PWA install both require a secure context.
2. Open the URL in Chrome on an Android phone.
3. Chrome menu → **Add to Home screen** → confirm install.
4. Open the installed app from the home screen icon (runs standalone, no
   browser chrome).
5. On the capture screen, grant camera permission and confirm the back
   camera opens and captures a photo.
6. Fill NPK/pH form, view results, tap "Listen to Results" (confirm audio
   plays) and "Download PDF Report" (confirm PDF saves to Downloads).
7. Take screenshots/screen recording of each step above as demo evidence.

## 5. Project Structure

```
pages/            # index.js (main flow), _app.js, _document.js, api/analyze.js, api/tts.js
components/       # PhotoCapture, SoilForm, ResultsCard
lib/              # soilLogic.js, sarvam.js, pdfReport.js
public/locales/   # en, hi, kn translation JSON files
public/manifest.json, public/icons/  # PWA manifest + icons
```
