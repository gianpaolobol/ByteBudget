# ByteBudget

**Eat well. Your way.** International dining discovery, personal meal budget and walking-radius search.

## Current status

Version 0.1.0: working responsive demo, English/Italian, fictional London/Bologna/Tokyo datasets; deterministic budget/meal/currency/freshness filtering and review-confidence ranking; saved places; PWA shell; Capacitor iOS/Android packaging. This is NOT a published store app and does NOT contain live restaurant data. Illustrations are CSS originals, not restaurant photographs.

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

iOS requires macOS/Xcode and Apple Developer signing. Android requires Android Studio/JDK/SDK. No signing credentials are committed. `com.bytebudget.app` is a provisional bundle identifier; verify ownership before store registration.

## Data model

See `docs/DATA_PROVIDER.md`. Demo is opt-in and explicitly labelled. No hardcoded worldwide price bands; city sample quantiles are descriptive, not official economic statistics. Prices expire after 90 days. A venue's upper meal-price estimate must fit the budget; this cannot guarantee the final bill. Currency is not guessed from the phone language. Radius is straight-line distance; the navigation provider supplies the walking route/time. No background geolocation.

## Release blockers

- Licensed production POI/review provider and verified per-meal price source, coverage, provenance and update pipeline.
- Backend provider, city/timezone/currency resolution, verified opening hours and restaurant menus.
- Real pedestrian routing if walking minutes must appear in result cards.
- Real restaurant offer portal, campaign payments, moderation, redemption tracking. No fake advertising flow.
- Native device QA, real app icons/splash artwork, signing, store listings/screenshots, support contact, reviewed privacy and terms.
- Name/trademark availability has not been cleared. GitHub repository availability is not trademark clearance.

No secret keys belong in client code, git, screenshots or documentation.
