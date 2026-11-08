# ByteBudget: live location verification status

Updated2026-11-08. TestFlight1.0.0(4) and Google Play internal1.0(3) both contain live-location configuration. Signed binaries were compiled directly on GitHub and inspected. Physical-device GPS QA remains pending.

## Active runtime

The public backend is https://bytebudget.gianpaolo-franceschi.chatgpt.site . Places(New) and Geocoding are enabled; the dedicated restricted Google key is server-only. Nearby mode, native CORS and live search are active; demo preview is disabled. Both capacitor://localhost and https://localhost are supported.

A durable shared reservation permits at most500provider searches total, without automatic reset or refund. Reservations fail closed before Google calls when unavailable or exhausted. Notifications are not a spending cap; the application counter is the configured usage control. Do not add other Google queries outside this controlled path.

## Implemented behavior

Foreground GPS is requested automatically through the platform permission flow. Denial must not invent a city. Coordinates determine geocoded locality/country, local currency and time zone independently of UI language.

Nearby search uses a100–1000m straight-line radius, requests at most20Google restaurant candidates, and rechecks distance, operational status and actual rating/count locally. Closed/unknown hours are retained and labelled; obvious grocery/retail primary types are excluded. Results are a provider subset, not an exhaustive best-in-city ranking. Walking navigation is delegated to the external maps application.

Google priceRange is a general venue estimate, not a verified lunch/dinner menu. Wrong-currency, malformed or unbounded ranges do not produce fabricated numeric limits. Live categories use Google's sourced priceLevel and remain selectable with sparse samples. Numeric caps derive only from actual selected-tier ranges and respect currency precision. Missing source categories remain separately unclassified; missing numeric ranges never acquire invented amounts. These estimates do not guarantee a final bill.

Live builds omit fictional venue datasets and demo city selection. API failure cannot silently enable sample data. Only foreground coarse/fine location permissions are present in Android; no background location permission was found.

## Verified evidence

114Node tests and build pass. iOS direct run42498229021 completed signing, upload, Apple processing and internal group distribution. Android direct run42522167699 completed signed AAB build and signature verification; Play accepted versionCode2 and confirms availability in Test interni. See CONTINUITA.md and docs/GITHUB_STORE_DELIVERY.md.

Four actual API requests at public landmarks passed on2026-11-08: Bologna/EUR, Ferrara/EUR, London/GBP and Tokyo/Shibuya/JPY. All venues were within600m and native CORS matched. These supplied coordinates are not readings from a phone GPS. Full aggregate results and coverage limits are in docs/QA_LIVE_BETA_2026-11-08.md.

## Remaining QA and product limits

A physical iPhone and Android must still verify permission grant/denial, location-disabled recovery, real current position, local city/currency, results refresh, distance/spending slider behavior and external walking navigation. No physical device or Android emulator is connected to the current agent environment.

Verified per-meal/lunch/dinner prices, consistent local price coverage, drink-only venue coverage and the restaurant-offer portal are not established by these backend tests. Production policy/listing review remains separate from internal beta delivery. Do not describe the beta as a fully validated production release.

## Regression correction
Current verified clients are iOS4 and Android3.125tests/build pass. Real venue photos, credits and venue/Maps links replace live illustration plates. A separate atomic lifetime500photo-media budget shares the existing database without resetting search reservations. No persistent photo-name cache. Runtime photo smoke tests returned200 and a real Google image CDN URL after fixing the Workers redirect-mode incompatibility. Public-landmark test at Castelletto returned10venues within1000m and9photo references. Browser QA used explicitly labelled public-coordinate fixtures, not phone GPS. Full evidence: docs/LOCAL_DISCOVERY_FIX_2026-11-08.md.
