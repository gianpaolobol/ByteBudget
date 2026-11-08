# ByteBudget: real location and real nearby venues

The user rejects the seeded TestFlight1.0.0(2) demo and requires automatic GPS, city/currency and actual nearby restaurants. This implementation replaces the city-catalog restriction; it does not yet constitute a new installed binary.

## Source behavior

- Automatic foreground GPS at startup with system permission; no background tracking. Denial never invents a city. Coordinates go to ByteBudget/Google for geocoding and nearby search only after the live service is configured.
- Google Geocoding identifies locality/postal town and country; country-to-currency3.0.1 selects the local currency, independent of UI language. tz-lookup6.1.25 resolves coordinate time zone. Tests include Ferrara/EUR, London/GBP and Tokyo/JPY. Country/timezone metadata must be kept updated.
- POST /api/nearby uses actual coordinates and100–1000m radius, restaurant type, max20 provider candidates. Exact distance rechecked locally on returned coordinates; closed, unrated, malformed and out-of-radius places excluded. Review-confidence ranking uses actual rating/count; results remain fixed until refresh. This is a provider subset, not an exhaustive best-in-city guarantee.
- General Google priceRange is a sourced venue estimate, not a verified lunch/dinner menu. It never fabricates prices from $, $$ or missing values. Wrong-currency/open-ended/malformed ranges do not acquire a numeric cap. Exact upper endpoint is conservative; provider endPrice is exclusive. Meal-specific verified catalog endpoint remains separately available.
- Four bands/slider derive from sufficient nearby sourced ranges (minimum10); these are marked estimates, not citywide economic statistics. With insufficient prices/calibration, price control is disabled and explicitly labelled; actual rated venues are still shown, with unknown prices indicated. Saved retains these venues.
- Live bundles omit demo datasets and selector. Mock datasets are development-only. An unavailable API cannot silently re-enable demo mode.

## Activation prerequisites — still unresolved

1. Authorized Google Maps project/key with Places API(New) and Geocoding enabled, appropriate key restrictions and provider quotas. No key exists in this project's runtime. Do not paste it into source, chat or the client.
2. Native-accessible HTTPS backend: LIVE_SEARCH_ENABLED=true, DISCOVERY_MODE=nearby, NATIVE_API_ENABLED=true, secret GOOGLE_PLACES_API_KEY; DEMO_PREVIEW_ENABLED=false. Existing private Sites audience is unchanged. Native API must support both capacitor://localhost and https://localhost. Public service needs gateway abuse controls plus provider-wide hard quotas; per-isolate10/min safeguard alone is insufficient.
3. Provider terms/privacy/EEA review and accessible policy pages before broader distribution. App shows Google Maps text and returned third-party attribution; source material remains in session memory, no persistent ratings/menus.
4. GitHub Actions signing/upload secrets are still absent. Public repo resolved runner-start billing block, not signing. Same existing Apple distribution certificate/private key and ByteBudget profile required. ASC API credential alone cannot sign an IPA.
5. Set repository variable BYTEBUDGET_API_BASE to the real API origin. Store live beta workflow uses live mode and checks status/native CORS before bundling/upload. No disconnected/seeded binary should be sent again.

Current global pricing checked2026-11-08: Nearby Search Enterprise1000free monthly then35USD/1000 at initial tier; Geocoding10000free then5USD/1000. Usage is aggregated per billing account; daily quotas/budget alerts are not automatically a hard monthly money cap. No billing activation or charges authorized by this source change.

## Verification

89 Node tests pass; new provider integration tests use synthetic responses and establish request/validation behavior only. Live bundle API-origin validation and fictional-data exclusion checked; native asset sync checked. Browser preview confirmed no demo/city selector when unconfigured; preview GPS unavailable. Live Google calls, native geolocation/currency on a physical device, new signed compilation and new TestFlight distribution remain unverified.

Sources: Google Nearby Search, Geocoding reverse lookup, Place priceRange reference, Maps pricing and Places attribution policies, checked2026-11-08.
