# Local discovery and budget/photo correction — 2026-11-08

## User-visible faults reproduced
The installed beta discarded operational places unless Google explicitly said openNow=true. Unknown opening hours and closed places disappeared. Sparse samples below10numeric ranges disabled the spending slider and bypassed tier filtering, so Low/unknown records could appear under the fixed Mid label. Live cards/details still used decorative demo-style plates.

## Final behavior
- Nearest-first restaurant/cafe/bar/bakery/takeaway query, maximum20provider candidates; exact100–1000m radius remains enforced. Operational places are labelled open, closed or hours unknown. Permanently closed and explicit supermarket/grocery/convenience/gas/tobacco/liquor-store primary types are excluded.
- Slider remains interactive directly on results. Source Google priceLevel maps FREE/INEXPENSIVE→Low, MODERATE→Mid, EXPENSIVE→High, VERY_EXPENSIVE→Luxury. Records without source categories appear in a separate section, never silently under Mid.
- Amounts derive solely from available real ranges in the chosen source tier, with currency precision and reachable tier endpoints. Missing amounts are explicit. Concrete caps exclude venues without known numeric bounds; only the far-right endpoint shows infinity.
- Real photos replace live plate illustrations. Details enlarge the photo and expose source author attribution, Maps link and website when provided. Missing/failed pictures use neutral placeholders. Photos may depict exterior/interior or food; no automatic food-subject guarantee.
- Photo media resolves server-only, then uses an allowlisted HTTPS Google image CDN. Source names are kept only in current consultation state. Visible container IntersectionObserver gates media resolution, and a per-consultation promise map prevents repeated reservations during slider movement/detail.
- Separate atomic lifetime500photo reservations use scope google-photos-v1. Existing google-maps-v1 lifetime500search counter is unchanged. Failure consumes a reservation, never refunds or resets. The verified Photos allowance is1000/month; the application cap is not an account-wide guarantee against unrelated usage.

## Verification
125Node tests and full build pass. Added actual DOM integration for sparse slider/source filtering/closed labels/photo/link behavior and offscreen/no-repeat photo requests. SQLite reservation tests, URL/resource validation, currency precision/top endpoint and unknown-category regression tests pass. Independent review findings were reproduced and fixed; final bounded re-review found no important blocker.

A real first photo smoke test exposed a Workers-specific failure: redirect:error throws before sending any request. Safe stage-only diagnostics identified the request boundary; official Cloudflare documentation confirmed it. Replaced with redirect:manual and reject non-2xx responses. Regression test and real photo JSON request both pass. Diagnostics do not print keys or coordinates and were removed from the final backend.

Actual public-coordinate test at central Castelletto (not the owner's phone GPS) after retail filtering:10venues within1000m,9photo references, source tiers4Low/1Mid/1High/4unknown. Two real photo resolves returnedHTTP200 and lh3.googleusercontent.com; browser confirmed an image loaded at640px natural width. Browser UI verified Low10EUR filtering, Luxury infinity, photo enlargement, author credit and Maps link. Fixture banner explicitly identifies sampled real data and simulated position. This is not physical-device QA.

## Delivered clients and backend
- iOS1.0.0(4), sourceea4a1b1f904fe4787bb8eb0ffbf2f0d2e8f78c28, run42529535149/job128880444905 SUCCESS. Apple processing finished and internal distribution succeeded. IPA artifact13636672334; SHA25681cd409aeaed4101ae7e0f97a5d84d1ff70757c5edf960aa5d0c24cead0b5bee.
- Android1.0(3), same client source, run42529584590/job128882061818 SUCCESS. Actual signed AAB inspected; original upload certificate matches. Artifact13636703732; SHA256c3a56b91e82531e6fe8475ddbc5490a5f193955893ceb9f2b4552b1c735fc09a. Play confirms release available in Test interni; no production promotion/new invites.
- Both actual native client bundles contain sourceTier filtering, IntersectionObserver/photo endpoint and the live API origin, without client Google key or demo startup marker.
- Existing public Site version16, source9725a0c76b1d8429e3c8d56f70f6124358a666fd, retains audience/envrevision2/secrets/database. Backend-only photo/retail refinements after the native client source require no second native build.

## Practical limits
Maximum20provider candidates is not an exhaustive inventory. Google's qualitative bands and general venue ranges do not establish verified per-person meal menus or the final bill. Source category/range gaps remain visible instead of being fabricated. The owner must still confirm the corrected client on a physical phone; no new physical GPS test is claimed.
