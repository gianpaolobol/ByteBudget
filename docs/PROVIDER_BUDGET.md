# Live Google budget gate

The nearby endpoint requires `PROVIDER_BUDGET_DB` (D1), `GOOGLE_FREE_ALLOWANCE_CONFIRMED=true`, a server-only Google key and `LIVE_SEARCH_ENABLED=true`. Missing/failed storage blocks all provider requests. `/api/status` reports unconfigured until controls exist. The nearby mode cannot fall through to the legacy catalog route.

One atomic SQL reservation consumes one search before sending either Google call. A search can make at most one Geocoding and one Enterprise Nearby request, with no retries. The shared lifetime ceiling is 500 searches, across restarts and concurrent Worker instances. Failed Google requests still consume a reservation; there is no monthly reset, refund endpoint or client-controlled counter. When exhausted, searches stop with HTTP429. Never delete/reset the row without reviewing the billing account's remaining free usage first.

This bounds app-originated calls; it does NOT guarantee zero account charges. Before enabling real queries, verify the current free allowance for both SKUs and all projects on the same billing account, audit other consumers/keys, restrict the runtime key to these two APIs and keep it server-only. At least 500 unused calls in each relevant monthly allowance must be available. Quota/pricing changes, another consumer or leaked key can invalidate the assumption. Keep `LIVE_SEARCH_ENABLED=false` until these activation gates are met. The 1EUR email alert is not a spending cap.

Sites declares the D1 binding in `.openai/hosting.json`; schema SQL is in `drizzle/0000_provider_budget.sql`. The migration contains only the counter and no location or venue data. Production migration and readiness must be verified after deployment; unit tests are not production evidence. Do not provision a new paid service for this binding.

Verification: tests use real SQLite for atomic SQL and concurrently invoke independently constructed handlers; Google itself is replaced at the HTTP boundary. No actual billable requests are used in tests.
