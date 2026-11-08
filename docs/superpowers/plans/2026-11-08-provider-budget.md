# Shared Google request budget implementation plan

Goal: prevent the live nearby endpoint from sending unbounded Google calls, including after server restarts and concurrent requests.

Architecture: reserve one Geocoding and one Nearby call together in a single durable SQLite/D1 update before any provider request. A fixed lifetime budget of 500 searches is deliberately conservative; it does not reset automatically. Missing storage or failed reservations block requests. This is an application call cap, not proof that the billing account has unused free allowance. Keep live search disabled until shared billing-account usage and key restrictions have been verified.

Tech stack: existing Worker ESM, D1-compatible SQL, Node test runner and node:sqlite for database integration tests. No UI changes or paid infrastructure added.

## Task 1: Budget gate
- [x] Add failing tests for parallel handlers sharing one database, restarts, exhausted budget, storage failure and errors consuming reservations.
- [x] Implement server/provider-budget.js with providerBudgetConfigured(env) and reserveProviderSearch(env). Require durable DB, explicit GOOGLE_FREE_ALLOWANCE_CONFIRMED=true and fixed scope google-maps-v1. No automatic reset or refunds.
- [x] Integrate before both Google calls and into nearby readiness. The legacy catalog route must not bypass the gate when DISCOVERY_MODE=nearby.
- [x] Run Node suite and build; update deployment instructions and migration.

Review focus: concurrent requests; storage unavailable; malformed reservation results; failure after one provider call; readiness reports false without controls. Activation and native delivery remain separate verified steps.

Validation: 103 tests pass and live build succeeds. Independent review found no blocking code defects. Added generated Drizzle SQL/journal/snapshot to satisfy deployment conventions. Deferred minor test additions: failure on second provider call and direct legacy-route request. Hosted migration and billing-wide audit remain activation gates.
