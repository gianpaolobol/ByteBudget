# Real location and nearby restaurants

User rejects the seeded TestFlight demo and authorizes autonomous implementation of the original live behavior.

- Replace precompiled city catalog discovery with server-side Google Nearby Search at actual foreground GPS coordinates; reverse-geocode city/country and derive local currency from country metadata, never phone language. Keep radius100–1000m and stable result snapshots.
- Consume sourced Google priceRange as a general venue estimate only. Never invent lunch/dinner menus or convert dollar-sign price levels into numeric meal prices. Hide meal-specific UI for these estimates; insufficient prices/calibration stay explicit. Preserve strict verified-menu endpoint as a separate optional capability.
- Add mocked provider integration tests that prove request coordinates/radius, country/currency switching, invalid request blocking, no fictional fallback and missing-price behavior. These do not establish live provider credentials or coverage.
- Switch direct store workflow from seeded demo to live beta; require public API origin and signing secrets before compiling. Keep demo builds explicitly separate for development.
- Actual activation needs an authorized Google Maps project/key (Places+Geocoding), suitable native-accessible API hosting, quota/abuse controls and existing GitHub signing/upload secrets. No paid account activation or new published build is claimed without these.

Known blocker: Sites runtime has no environment entries; Google key/catalog never configured. GitHub native runners now start after user made repo public, but signing/upload secrets are absent. Existing TestFlight1.0.0(2) still contains fictional demo. This task must not relabel that binary as live.
