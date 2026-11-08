# ByteBudget live beta QA — 2026-11-08

## Scope and method

Four bounded POST /api/nearby requests were sent to the configured public backend, once per public landmark, using600m radius and English language. Two requests used capacitor://localhost and two https://localhost. No personal/user coordinates, signing credentials or provider keys were sent or recorded in this report. No retry loop was used. These four searches consume four reservations from the existing lifetime500search cap.

| Public landmark area | Returned locality | Currency | HTTP | Open rated venues | Sourced price ranges | Farthest venue, approx. |
| --- | --- | --- | --- | --- | --- | --- |
| Piazza Maggiore, Bologna | Bologna | EUR | 200 | 8 | 8 | 466m |
| Castello Estense, Ferrara | Ferrara | EUR | 200 | 13 | 13 | 464m |
| Trafalgar Square, London | London | GBP | 200 | 16 | 11 | 592m |
| Shibuya crossing, Tokyo | Shibuya | JPY | 200 | 7 | 3 | 452m |

Every response declared demo:false, returned the expected country/currency/time zone, matched the request's native CORS origin, and contained only open venues with actual review counts and coordinates within600m. Shibuya is the geocoder's returned locality for that Tokyo landmark. Result counts and prices are time-sensitive observations, not guaranteed coverage.

## Pricing coverage finding

The client requires at least10sourced ranges for descriptive band calibration. Bologna(8) and Shibuya(3) fell below that threshold in these requests; Ferrara(13) and London(11) exceeded it. Therefore the expected safe behavior is a disabled price filter for the insufficient samples, rather than invented amounts. This report verifies API sample counts; it does not claim that the resulting UI state was exercised on a phone.

Available ranges are Google general venue estimates. The test does not establish per-person lunch/dinner menu totals or citywide affordability thresholds. Pricing coverage remains a material product limitation.

## Existing native release evidence

- iOS1.0.0(3): signed IPA inspected; Apple processed it and assigned/distributed it to the existing internal TestFlight group.
- Android1.0(2): signed AAB inspected; jarsigner passed in CI; Play accepted it and confirmed availability in Test interni.
- Android run42522167699, source2f2d1754cb774e45fc2e875599f90b7d284cf2f5.114Node tests/build passed. The latest unchanged application code also passed Checks42525882415.
- No new native build or store upload is needed for these documentation-only QA findings.

## Not tested on a physical device

Permission dialog grant/denial; OS location disabled; live GPS acquisition and precision rejection; movement/refresh; spending slider and filtered cards; external walking navigation. The current agent environment has no attached physical phone or Android emulator. These checks remain pending; supplied public coordinates do not substitute for GPS acquisition.

Required acceptance on each platform: start the delivered version, grant foreground precise location, compare locality/currency with the actual position, refresh after movement, exercise100m and1000m radii and available spending tiers, open navigation, then repeat with permission denied and OS location disabled. Error paths must not display fictional cities or silently resume demo data.
