# ByteBudget

> **Copyright © 2026 Gian Paolo Franceschini — All rights reserved for original proprietary contributions.** See [LICENSE.md](LICENSE.md). Third-party licenses and GitHub's permitted platform uses remain applicable.


**Eat well. Your way.** International dining discovery, four city-adjusted price tiers and walking-radius search.

## Current status

Live-location betas are delivered internally on both platforms: **iOS1.0.0(4)** on TestFlight and **Android1.0(3)** on Google Play Test interni. Both are compiled directly on GitHub; Android's signed AAB was uploaded through the existing Play Console session. No new Expo/EAS build is involved.

125 Node tests and the build pass. Actual signed IPA/AAB inspections confirm the live API origin and foreground location configuration. Live API smoke tests at four public landmarks passed: Bologna/EUR, Ferrara/EUR, London/GBP and Tokyo's Shibuya/JPY, with all returned venues within the requested600m radius and both native origins supported. These are backend tests with supplied public coordinates, not physical-device GPS tests. See docs/QA_LIVE_BETA_2026-11-08.md.

The restricted Google runtime key stays server-only. A durable shared lifetime cap stops after500searches total, with no automatic reset. Current prices are sourced general venue estimates, not verified lunch/dinner menu prices. The spending slider stays enabled with sparse samples. Live tiers use Google's qualitative priceLevel; concrete within-tier limits use actual sourced ranges only. Unclassified venues appear separately, never silently in Mid. The installed-beta budget/photo regression is corrected in iOS4/Android3. Physical-device confirmation of these replacement builds remains pending. See docs/LOCAL_DISCOVERY_FIX_2026-11-08.md.

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

See `docs/DATA_PROVIDER.md`. The unconfigured development preview automatically loads an explicitly labelled demo city; configured live mode and native static startup do not receive fictional data automatically. No hardcoded worldwide price bands. Live venues use Google's sourced local priceLevel; numeric catalog/demo calibration remains separate. Prices expire after 90 days. Venues are classified using the upper meal-price estimate. Low is below the first boundary, Mid includes the second boundary, High includes the third boundary and Luxury is above it. A provider’s exclusive upper endpoint is handled at the currency’s minor unit. This cannot guarantee the final bill. Currency is not guessed from the phone language. Radius is straight-line distance; the navigation provider supplies the walking route/time. No background geolocation.

## Release blockers

- Licensed production POI/review provider and verified per-meal price source, coverage, provenance and update pipeline.
- Configure and validate production coverage for the implemented backend provider, city catalog, opening hours and restaurant menus.
- Real pedestrian routing if walking minutes must appear in result cards.
- Real restaurant offer portal, campaign payments, moderation, redemption tracking. No fake advertising flow.
- Native device QA, final brand artwork, production store listings/screenshots, support contact, reviewed privacy and terms. Internal beta signing/delivery is complete.
- Name/trademark availability has not been cleared. GitHub repository availability is not trademark clearance.

No secret keys belong in client code, git, screenshots or documentation.

Build outputs: `dist/client` (web/native assets), `dist/server/index.js` (Worker including assets). `npm start` runs the local Worker adapter. Production runtime variables must be configured as server secrets, never inside client code. See `.env.example` for names only.

Location permission is requested automatically at application startup, through the platform system dialog. There is no separate Use location control. In live mode, denial must show a location error without inventing a city; only an explicitly enabled development preview may use labelled sample data. Location is not transmitted to the provider while the service is unconfigured. Language follows the phone preferences until manually changed; Arabic uses RTL. Translation packs are complete but native-speaker editorial review remains recommended before store release.

The user removed numeric budget entry. Mid is initially selected. City/meal thresholds can be configured as lowMax/midMax/highMax. With sufficient own menu samples, the fallback estimates the low/mid boundaries and sets the Luxury threshold above both the 95th percentile and 2.4 times the Mid boundary. These are descriptive estimates, not a luxury quality certification. Demo thresholds and prices are fictional; Bologna illustrates 20/50/120 EUR.

Latest interaction: one spending slider replaces the four buttons. Four local price tiers remain as labels. Within a tier, the slider sets a concrete per-person ceiling without typing; only the far-right endpoint is Luxury without a spending ceiling. Midpoint High is 85 EUR for the fictional Bologna 20/50/120 example. The spending control always increases left-to-right, including Arabic. Both sliders use an88px touch surface; readouts update during dragging and spending results update on release. Physical device gesture and status-bar checks remain pending.

## Direct GitHub delivery

For iOS use **Store live beta (direct GitHub)** on main, selecting ios. For Android use **Android live beta package (direct GitHub)** with an explicit version code above every existing Play upload, then upload the signed AAB to the existing internal track through Play Console. The legacy Android API-upload lane requires a separate Publisher credential and is not the current delivery route.

See docs/GITHUB_STORE_DELIVERY.md for verified releases and exact prerequisites. Existing Apple and Android signing secrets are configured and must be reused. Historical EAS workflows are not part of this delivery path.

## Live location implementation — 2026-11-08

User rejected the seeded native demo as insufficient. Source now includes foreground GPS → reverse geocoded city/country → local currency → Google Nearby Search, with no hardcoded city catalog. Google priceRange is a general venue estimate, stored separately from verified lunch/dinner menus. The live UI hides meal-specific controls for those estimates, displays actual sourced prices only and never substitutes qualitative priceLevel for numeric amounts. Unknown-priced venues are excluded from budget results; existing Saved records remain available as session records with explicit unavailable prices.

Live bundles exclude fictional venue datasets and demo city selection; API failures do not enable samples. Direct workflow is now **Store live beta (direct GitHub)** and refuses upload without configured nearby API/native CORS.

This live configuration is included in TestFlight1.0.0(5) and Android internal1.0(2). Public backend, restricted server key, durable usage cap and signing setup are active. Installation and real GPS/permission behavior on physical devices remain to be checked. See docs/LIVE_LOCATION_STATUS_2026-11-08.md.
