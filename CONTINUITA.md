# ByteBudget — continuity 2026-11-07

User chose name ByteBudget and approved ivory/deep-teal graphic direction. Private repo gianpaolobol/ByteBudget created through GitHub UI. User authorizes development and publication. Do not claim store publication without evidence.

App currently contains an explicitly labelled demo. Source: HTML/CSS/ES modules, Capacitor wrappers. Run npm test and npm run build. London/Bologna/Tokyo examples are entirely fictional. Real-data integration is deliberately not fabricated. See README release blockers and docs/DATA_PROVIDER.md.

Requirements: automatic city-specific pricing and currency; personal maximum per meal; low/mid/high indicators automatic, not fixed global euro values; lunch vs dinner; 100m–1km radius; stable results; organic ranking by review confidence independent from sponsored offers; navigation handoff. Future Eat/Drink switch, verified drink-specific pricing and sponsored offers remain to implement. Scope first launch: meals.

Site project: appgprj_6aef7e0f046081918ca97268b03c8f92. Manifest .openai/hosting.json. Preserve project identity; never create duplicate Site.

## v0.2.0 — 2026-11-07
Server Worker implemented, replacing static hosting manifest while preserving the same project ID. `npm run build` produces dist/client for Capacitor and dist/server/index.js for Sites. Native geolocation plugin 8.2.4 bundled with esbuild. Foreground precise location only; imprecise coordinates do not produce misleading tiny-radius results. Live readiness checked before GPS.

Google Place Details adapter implemented but disabled: requires secret key, verified per-meal catalog and explicit LIVE_SEARCH_ENABLED. Generic Google price estimates are not used as meal-specific facts. Catalog provides city/currency/timezone and own menu samples; Google supplies current ratings/open status without persistence. No provider credential or authentic menu dataset has been configured. Native remote API requires explicit activation and suitable API hosting (development Site remains private). More than 20 verified candidate places gives an explicit narrower-search response; public release needs scaling/cost controls.

Known environment constraints: GitHub Actions account billing block remains; local Java 17, no Android SDK or Xcode available. Native sync is verified, compilation and device QA are pending. Do not claim store readiness.

## v0.3.0 — automatic location and 12 languages
User removed the separate Use location button. App invokes foreground location automatically at startup; system/OS consent remains mandatory. Denial does not block the demo. Subsequent searches reuse the established request flow. No background tracking. Language is resolved from navigator.languages unless a valid explicit preference was saved. Complete packs: en, it, es, de, fr, pt, ru, zh (Simplified Chinese), ja, ko, ar, hi; Arabic RTL. One-line slogan retained. Prices/currency continue to derive from city data, not UI language. Native-speaker translation review remains pending.
