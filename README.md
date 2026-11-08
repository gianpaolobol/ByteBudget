# ByteBudget

**Eat well. Your way.** International dining discovery, four city-adjusted price tiers and walking-radius search.

## Current status

The source implements real foreground GPS, reverse-geocoded city/country/currency and Google Nearby Search in 12 interface languages. A durable shared request budget (500 searches total, no automatic reset) is deployed on the existing web service; 109 Node tests pass. The dedicated restricted server key is stored as a backend secret and private live Google search has been verified (Bologna/EUR, 14 venues). Anonymous native access remains blocked by the existing private hosting audience. Firebase Blaze and the project's billing link are verified. The existing TestFlight 1.0.0(2) and Android 1.0(1) are still the earlier fictional-city demo; no replacement native live binary has been delivered. See CONTINUITA.md for verified checkpoints.

## Run

Node 22+ (Node 24 recommended).

```
npm ci
npm test
npm run build
npm start
```

## Native

```
npm run build
npx cap sync
npx cap open ios
npx cap open android
```

iOS requires macOS/Xcode and Apple Developer signing. Android requires Android Studio/JDK/SDK. No signing credentials are committed. `com.bytebudget.app` is registered for ByteBudget on both stores.

## Data model

See `docs/DATA_PROVIDER.md`. The unconfigured development preview automatically loads an explicitly labelled demo city; configured live mode and native static startup do not receive fictional data automatically. No hardcoded worldwide price bands; city sample quantiles are descriptive, not official economic statistics. Prices expire after 90 days. Venues are classified using the upper meal-price estimate. The four half-open bands are Low, Mid, High and Luxury; Luxury has no ceiling. This cannot guarantee the final bill. Currency is not guessed from the phone language. Radius is straight-line distance; the navigation provider supplies the walking route/time. No background geolocation.

## Release blockers

- Licensed production POI/review provider and verified per-meal price source, coverage, provenance and update pipeline.
- Configure and validate production coverage for the implemented backend provider, city catalog, opening hours and restaurant menus.
- Real pedestrian routing if walking minutes must appear in result cards.
- Real restaurant offer portal, campaign payments, moderation, redemption tracking. No fake advertising flow.
- Native device QA, final brand artwork, signing, store listings/screenshots, support contact, reviewed privacy and terms.
- Name/trademark availability has not been cleared. GitHub repository availability is not trademark clearance.

No secret keys belong in client code, git, screenshots or documentation.

Build outputs: `dist/client` (web/native assets), `dist/server/index.js` (Worker including assets). `npm start` runs the local Worker adapter. Production runtime variables must be configured as server secrets, never inside client code. See `.env.example` for names only.

Location permission is requested automatically at application startup, through the platform system dialog. There is no separate Use location control. Denial leaves the demo usable; location is not transmitted to the data provider while the service is unconfigured. Language follows the phone preferences until manually changed; Arabic uses RTL. Translation packs are complete but native-speaker editorial review remains recommended before store release.

The user removed numeric budget entry. Mid is initially selected. City/meal thresholds can be configured as lowMax/midMax/highMax. With sufficient own menu samples, the fallback estimates the low/mid boundaries and sets the Luxury threshold above both the 95th percentile and 2.4 times the Mid boundary. These are descriptive estimates, not a luxury quality certification. Demo thresholds and prices are fictional; Bologna illustrates 20/50/120 EUR.

Latest interaction: one spending slider replaces the four buttons. Four local price tiers remain as labels. Within a tier, the slider sets a concrete per-person ceiling without typing; only the far-right endpoint is Luxury without a spending ceiling. Midpoint High is 85 EUR for the fictional Bologna 20/50/120 example. The spending control always increases left-to-right, including Arabic.

## Direct GitHub delivery

User selected GitHub Actions for both compilation and store upload, without Expo. Run **Store demo (direct GitHub)** on main, choosing iOS, Android or both. This uses the canonical Capacitor iOS SPM project with Xcode and the Android project with Gradle/JDK21, then Fastlane to deliver internally. No Expo login/token/build/download is used.

See [setup and exact prerequisites](docs/GITHUB_STORE_DELIVERY.md). Making the repository public resolved runner startup; the store workflow still requires the native-accessible live API and signing/upload secrets. No replacement live store binary has been delivered. The existing Android demo remains available. Historical EAS workflows are retained but are not part of this delivery path.

## Live location implementation — 2026-11-08

User rejected the seeded native demo as insufficient. Source now includes foreground GPS → reverse geocoded city/country → local currency → Google Nearby Search, with no hardcoded city catalog. Google priceRange is a general venue estimate, stored separately from verified lunch/dinner menus. The live UI hides meal-specific controls for those estimates, displays actual sourced prices only and explicitly disables price filtering when calibration is insufficient. Unknown-priced venues can still appear in that clearly labelled fallback and remain in Saved.

Live bundles exclude fictional venue datasets and demo city selection; API failures do not enable samples. Direct workflow is now **Store live beta (direct GitHub)** and refuses upload without configured nearby API/native CORS.

This source is NOT yet activated on the user's phone: existing TestFlight1.0.0(2) remains the demo. Real Google credentials, native-accessible API hosting/quotas and GitHub signing/upload secrets remain prerequisites. The repository is now public; runner startup was verified after the visibility change. See docs/LIVE_LOCATION_STATUS_2026-11-08.md.
