# Live provider readiness Implementation Plan
Goal: production provider adapter with no invented per-meal costs, plus schedule-aware menu prices and native foreground geolocation.
Spec: existing approved ByteBudget design and DATA_PROVIDER.md.
Architecture: server-only Google Places adapter joins fresh licensed live ratings to independent verified menu records. No key means no outbound requests. Catalog coverage is explicit, automatic city context derives from trusted geographic catalog; unavailable coverage is a typed error. API transport remains provider-neutral and is not automatically activated for unreviewed production data.
Global constraints: exact locations never logged; no API keys in client or git; max radius 1000m; no sponsored rank changes; preserve demo.
Review focus: token leakage, bad request causes paid calls, missing menu, timezone-dependent weekdays, outside supported city coverage, silent live-to-demo fallback.
1. Add failing tests for weekday prices and timezone boundaries; implement domain and validation.
2. Add failing tests for bounded same-origin server handler, missing credentials, menu-catalog joins, no usage on invalid input, provider errors and attribution. Implement server modules and CLI for local tests.
3. Add native foreground geolocation using Capacitor plugin via bundled assets. Tests for denied/inaccurate location and client request state. Build and native sync.
4. Review tests, update docs/continuity, persist to GitHub and deploy updated private preview. Live provider remains disabled until a key and trusted catalog are configured.
