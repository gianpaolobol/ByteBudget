# Open data pilot

Build with `BYTEBUDGET_OPEN_PILOT=true npm run build`, or select `open-pilot`
in the internal store workflow. The installed client has a bundled catalog
and uses foreground GPS, with no network calls for discovery. Coverage is
limited to the bounding boxes in the catalog for central Bologna and Savigno.
The catalog is a snapshot, so refreshing it requires rebuilding the pilot.

## Inputs and processing

- OpenStreetMap Overpass extract around Rialto (1 km, snapshot 2026-10-21) and
  OSM API map extracts around Rialto, Mercanzia and Savigno (2026-11-11).
- Overture Maps Places release 2026-10-21.0. Use the Overture STAC index and
  bounding boxes in the catalog to retrieve rows. The importer expects JSON
  arrays with the published Places fields, including `bbox`, `taxonomy`,
  `names`, `operating_status`, `confidence`, and optional `websites`.
- Run `python scripts/build-open-pilot-catalog.py EXTRACTS public/open-pilot-catalog.json`.
  The expected input filenames are in the script. The importer keeps source
  IDs, excludes inactive and low-confidence Overture records, and merges
  records when nearby names match. It can still miss aliases or merge
  similar names and does not establish that a listing is currently in business.
- The JSON catalog is also shipped as a downloadable asset. OpenStreetMap
  data are available under ODbL. Overture credits and source licenses are
  published at https://docs.overturemaps.org/attribution/.

## Comparison

Counts are distinct catalog candidates before any time-of-day filter, with
the same radii as the prior OpenStreetMap sample.

| Zone | Radius | OSM in merged catalog | Additional Overture records | Combined | With raw opening hours |
| --- | ---: | ---: | ---: | ---: | ---: |
| Cinema Rialto | 350 m | 43 | 24 | 67 | 18 |
| Piazza della Mercanzia | 350 m | 186 | 90 | 276 | 52 |
| Savigno | 1 km | 3 | 10 | 13 | 1 |

The Mercanzia count differs from the first OSM sample (163) because the importer
now includes explicitly tagged wine, ice cream, pastry and deli shops and resolves aliases across extracts. Five of the six named
Rialto examples appear in the combined catalog: Fram, O' Sole Mio, Miky &
Max, Sombrero and Bar Baldi. Pizzeria da Rialto remains unconfirmed. This is
a comparison with a small previously verified list, not a full coverage or
recall estimate. Overture confidence is used to qualify catalog entries and
is never shown as a customer rating. None of the pilot entries has a verified
price or customer rating. The pilot shows distance order, category icons and
known weekly hours. It shows unknown hours for missing or unsupported rules.

The category rail filters the distance-ordered list and keeps the selection
when the location changes. Specialized categories require explicit source tags
or taxonomy. A generic bar is shown with the café pictogram.
