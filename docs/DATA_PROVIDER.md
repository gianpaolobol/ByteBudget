# Verified-menu provider contract — v0.4

## User-facing search
Four choices: low, mid, high, luxury. There is no numeric budget input or numeric spending cap. Mid is initially selected. Radius 100–1000 m; lunch/dinner; local currency derives from city data, not interface language. Classification uses the upper verified meal-price estimate:

- Low: max < lowMax
- Mid: lowMax <= max < midMax
- High: midMax <= max < highMax
- Luxury: max >= highMax, without an upper ceiling

`priceBands` may be configured per city and meal: `{lunch:{lowMax,midMax,highMax},dinner:{...}}`. Values must be positive, finite, strictly increasing and expressed in the city currency. Bologna's demo uses 20/50/120 EUR; London/Tokyo examples are fictional too. Do not treat these examples as verified real-world price indices.

If no calibrated configuration exists, at least ten fresh independent menu records are required. Fallback low/mid boundaries use approximately the 1/3 and 2/3 quantiles; highMax is ceil(max(2.4*midMax,p95)). This intentionally keeps High broad and reserves Luxury for unusually high prices. The estimate is not a luxury quality certification or an exhaustive city statistic. Degenerate samples produce no usable bands; don't invent thresholds.

## API
`GET /api/status` returns `{configured:boolean}` without secrets.
`POST /api/search` accepts `{lat,lng,radius,tier,meal,language}`. `tier` must be one of the four values. No budget field is required or sent. Invalid input cannot trigger provider calls. Unknown city, unknown bands or missing menus produce explicit errors. All API responses are no-store.

Response: `{city,currency,timeZone,lat,lng,venues,citySample,priceBands?,coverage,attribution}`. Currency ISO 4217; timezone IANA. Venues contain `{id,name,lat,lng,currency,rating,reviewCount,isOpen,prices:{lunch:{min,max,updatedAt,source,validDays?,validFrom?,validUntil?},dinner:{...}},cuisine,menu:[{name,price}]}`. Prices must be finite, nonnegative, ordered and sourced; date freshness max 90 days. Days 0=Sunday…6=Saturday use local city time. Valid date ranges are inclusive YYYY-MM-DD.

## Sources and configuration
`server/search.js` joins independent verified menu records to Google Place Details ratings/opening data by place ID. Generic Google price ranges never become invented per-meal costs. Only selected-tier verified menu candidates inside the radius cause lookups. Details calls contain place IDs, not user GPS coordinates. Responses aren't persisted. User position is handled by ByteBudget, not sent to Google by this adapter.

Environment: LIVE_SEARCH_ENABLED=true, GOOGLE_PLACES_API_KEY (secret), VERIFIED_CATALOG (trusted JSON). No authentic key or menu catalog is configured. No billing is automatically activated. Provider quotas, budget controls and durable gateway rate limiting are required before public release; the per-isolate limiter is only a secondary safeguard. More than 20 selected-tier candidates returns search_too_broad before any paid lookup. Details run in batches of four.

Catalog: `{cities:[{id,name,currency,timeZone,priceBands?,bounds:{south,north,west,east},venues:[{placeId,name,lat,lng,currency,cuisine,prices,menu}]}]}`. Independent coordinates/bounds and menus must be licensed or owned. Overlapping city bounds fail for that query. Dateline-spanning bounds unsupported. Google licensing, EEA terms and attribution still require production review.

## Location and native apps
At startup, foreground location is requested automatically through system consent. No background watch. Denial stops network processing and leaves the demo available. No location is transmitted to the backend/provider while unconfigured. Subsequent searches check readiness before requesting another position.

Native remote access requires an explicitly configured API origin plus NATIVE_API_ENABLED=true. Only capacitor://localhost and https://localhost get CORS permission; no wildcard/cookies. Development hosting stays private. Production native API access requires suitable public/per-user authenticated hosting and abuse controls.

## UI state
Results hold their searched meal, tier and radius. Saved venue records can be kept in UI-session memory across same-city searches; only IDs/preferences are persistent. Do not persist Google ratings in local storage. Saved live IDs after restart need future re-resolution through a suitable provider endpoint before a public production release.

References checked 2026-11-07:
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://capacitorjs.com/docs/apis/geolocation
