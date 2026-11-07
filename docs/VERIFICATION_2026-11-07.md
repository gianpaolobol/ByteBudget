# Verification — initial release

- Node 24 test runner: 9 tests pass (budget/meal boundaries, stale/unknown/currency/open filtering, geodesic radius, review confidence, city sample requirements, unique demo IDs, invalid provider input, visual sanitization).
- Static build succeeds; JavaScript syntax checked.
- Capacitor 8.6.0 projects generated and synchronized for iOS and Android. Native compilation and real-device execution NOT performed.
- Browser QA: initial discover, explicit demo city chooser, London GBP dinner results under £35, venue detail, save, saved list, Tokyo JPY city switch with no false saved results, Italian locale. Demo navigation blocked as intended by code (no fictional destination route).
- Independent read-only code review: fixed globally colliding saved IDs, hidden refresh errors, unsafe visual/currency interpolation and provider payload validation before state assignment.
- Original design uses photography; first executable demo uses original CSS food illustrations. Real restaurant photography awaits licensed provider data.
- Real provider, sponsored offer commercial flow, precise pedestrian time, native device QA and store publication remain pending. No claim of end-to-end live launch.

## v0.2.0 validation
Added menu schedule/timezone tests, server adapter tests, native origin policy, Worker asset/status tests and foreground geolocation/client error tests. Native Geolocation plugin synchronized on both platforms. Google integration tested with synthetic responses, not real credentials. Production activation and physical-device QA remain pending. Independent review identified and corrected stale live snapshots, missing native CORS policy and unrelated Nearby Search truncation (replaced with direct details by verified ID).

Browser regression found and fixed: the UI helper named `location()` shadowed the browser Location object, causing the readiness check to fail before calling the API. Renamed it `locationMarkup()`. Reproduced generic failure before the fix; after the fix, browser QA shows the correct provider-not-configured message without requesting GPS. This is a manual browser regression check, in addition to 36 automated tests.

## v0.3.0 localization and automatic position
41 automated tests pass. Complete language-key parity checked for 12 packs; phone language variants map to the supported base locale. Arabic RTL verified. Browser QA verified Russian and Chinese interfaces, live status translation after language changes, Arabic direction and no headline overflow at the preview width. No Use location button remains; the location label is informational unless an explicit demo city is selected. On startup, foreground permission is requested once through the OS; permission refusal stops network processing and leaves the demo accessible. Physical-device permission prompts remain to validate on iOS and Android.

## v0.4.0 tier verification
50 automated tests pass. Added exact 20/50/120 boundaries without overlaps, Luxury prices above the former numeric cap, configured city/meal thresholds, missing threshold behavior, tier-only API requests, same-city saved record merge and immutable searched criteria. Browser verified default Mid, four clickable buttons, no numeric input, Bologna illustration thresholds and Luxury results from 144 to 304 EUR with no budget ceiling in the summary. Build and native sync pass; native physical-device QA remains pending.

## v0.5.0 spending slider
55 automated tests pass. Added all tier segments, High625=>85 EUR, local JPY scaling, observed Luxury tail prices, invalid positions, unlimited1000 and exclusion of cheaper tiers/higher amounts. Browser QA reproduced an actual drag to625 and the Alta85 EUR output, then results only59/79 EUR. Arabic page remains RTL but spending input and labels are LTR; physical-right drag reaches1000 and unlimited Luxury. Native sync passes; physical-device QA remains pending.

## Separate right-hand price readout
58 automated tests pass. New checks cover blank unknown amount, EUR/GBP/USD formatting independent of interface language, and infinity for unlimited. Browser verified tier High at x446 and GBP105 price at x858 after a real drag to625 in London demo; no middle dot or dash in the visible selected tier row. Build/native sync pass. Real-data activation remains pending; sample cities are demonstrations.

## First-open finite-price regression
63 automated tests pass. New tests reproduce missing first-open dataset and check server preview injection, all finite sample positions, remembered city/currency, invalid preference safety and live-mode exclusion. Browser verified opening the root URL directly with no city-selection action: High85 EUR was present. Actual drag to375 changed it to Mid35 EUR; reload preserved Mid35 EUR and the labelled demo city. This replaces the insufficient prior QA that started only after Explore. Native sync/build pass; real provider activation and physical-device QA still pending.
