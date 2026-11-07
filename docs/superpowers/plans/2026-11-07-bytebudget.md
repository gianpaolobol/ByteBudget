# ByteBudget Implementation Plan
Goal: tested mobile web application and native packaging, persisted on GitHub.
Spec: ../specs/2026-11-07-bytebudget-design.md
Architecture: static ES modules, provider adapter, native Capacitor wrappers; data production service must be supplied through explicit endpoint.
Global constraints: 100–1000 m; budget in local currency; separate lunch/dinner; stable snapshots; no fabricated real data.
Review focus: stale/missing meal prices, denied location, no compatible venues, currencies mixed, unavailable network.
1. Domain: tests first for distance, budget/meal/currency/freshness, review confidence ordering, city bands. Implement src/domain.js and run node --test.
2. Interface: discovery/results/details/saved; EN/IT; location state, explicit demo, per-meal pricing, navigation; responsive accessible HTML/CSS.
3. Packaging: manifest/service worker/icons; Capacitor config, build scripts, CI and release checklist. Test/build, review and commit/push after repository exists.
