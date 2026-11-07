# Production provider contract

Client expects a same-origin HTTPS POST endpoint configured as `window.BYTEBUDGET_CONFIG.searchEndpoint` before loading src/app.js. No external credentials are stored by the client. Request: `{lat,lng,meal}` only after explicit user action and OS permission. Exact location must not be logged; rate limit and apply request limits server-side.

Response: `{city,currency,timeZone,venues:[...]}` with IANA timezone, ISO 4217 currency and current origin-independent city sample.
Each venue: `{id,name,lat,lng,currency,rating,reviewCount,isOpen,prices:{lunch:{min,max,updatedAt,source},dinner:{...}},cuisine,menu:[{name,price}]}`. Only verified open=true entries can qualify. Upper price estimate must be <= budget, correct currency, selected meal, nonfuture and no older than 90 days. Source and meal composition must be reviewed before production. No conversion from generic €€ to invented exact menu costs.

City bands: 1/3 and 2/3 observed upper meal price quantiles, at least 10 records, use city-wide sample and matching currency/meal. This is a first algorithm, not a validated definition of citywide cost. The demo implements this to exercise UI, not to represent London/Bologna/Tokyo actual prices. City coverage confidence and outlier handling require production validation.

Google Places is one possible POI/review source, not a complete meal-price source. Review current provider licensing, EEA conditions, attribution and retention requirements before integration. No scraping or republishing unlicensed review databases. Routes/opening/service hours require separate validation.

## Implemented server adapter (v0.2.0)

`server/search.js` joins independent, verified menu records to Google Place Details ratings/opening data by place ID. Generic Google price ranges are never treated as verified meal costs. Outbound details contain place IDs, not user GPS coordinates. Results are limited to the supplied catalog; no worldwide coverage is implied.

Worker routes: `GET /api/status` and `POST /api/search`. Client checks readiness before requesting GPS. Search body adds `radius` (100–1000), `budget` (positive), and `language` (en/it) to the prior `{lat,lng,meal}`. All API responses use no-store. Native cross-origin requests require explicit NATIVE_API_ENABLED=true; only capacitor://localhost and https://localhost are allowlisted, with no wildcard or cookies. The deployed development Site remains owner-private; native production requires a suitable accessible API deployment and per-user abuse controls.

Environment: LIVE_SEARCH_ENABLED=true, GOOGLE_PLACES_API_KEY (secret), VERIFIED_CATALOG (trusted JSON). No real key or catalog is currently configured. The adapter does not activate provider billing. API quotas/spending controls and a durable gateway rate limit must be configured before public exposure. Current per-isolate request limit is a secondary safeguard, not an account-wide cost ceiling. Searches with over 20 verified candidates fail before provider usage; a production city-scale strategy remains necessary. Detail calls run in batches of four. No upstream Google responses are persisted.

Catalog shape: `{cities:[{id,name,currency,timeZone,bounds:{south,north,west,east},venues:[{placeId,name,lat,lng,currency,cuisine,prices:{lunch:{min,max,updatedAt,source,validDays?,validFrom?,validUntil?},dinner:{...}},menu:[{name,price}]}]}]}`. Coordinates and bounds must come from a source you have rights to use. Overlapping city bounds are rejected for the current user position. Dateline-spanning bounds are unsupported. `validDays` uses 0=Sunday…6=Saturday in the city's IANA timezone. Date bounds are inclusive ISO YYYY-MM-DD. Ten fresh own-menu city-wide samples are required for descriptive bands; this is still a sample, not an exhaustive city price index.

Source references checked 2026-11-07:
- https://developers.google.com/maps/documentation/places/web-service/place-details
- https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://capacitorjs.com/docs/apis/geolocation
