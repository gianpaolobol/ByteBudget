# Production provider contract

Client expects a same-origin HTTPS POST endpoint configured as `window.BYTEBUDGET_CONFIG.searchEndpoint` before loading src/app.js. No external credentials are stored by the client. Request: `{lat,lng,meal}` only after explicit user action and OS permission. Exact location must not be logged; rate limit and apply request limits server-side.

Response: `{city,currency,timeZone,venues:[...]}` with IANA timezone, ISO 4217 currency and current origin-independent city sample.
Each venue: `{id,name,lat,lng,currency,rating,reviewCount,isOpen,prices:{lunch:{min,max,updatedAt,source},dinner:{...}},cuisine,menu:[{name,price}]}`. Only verified open=true entries can qualify. Upper price estimate must be <= budget, correct currency, selected meal, nonfuture and no older than 90 days. Source and meal composition must be reviewed before production. No conversion from generic €€ to invented exact menu costs.

City bands: 1/3 and 2/3 observed upper meal price quantiles, at least 10 records, use city-wide sample and matching currency/meal. This is a first algorithm, not a validated definition of citywide cost. The demo implements this to exercise UI, not to represent London/Bologna/Tokyo actual prices. City coverage confidence and outlier handling require production validation.

Google Places is one possible POI/review source, not a complete meal-price source. Review current provider licensing, EEA conditions, attribution and retention requirements before integration. No scraping or republishing unlicensed review databases. Routes/opening/service hours require separate validation.
