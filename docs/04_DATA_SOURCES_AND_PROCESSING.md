# 04 — Data sources, tools, inputs / outputs & processing

## Key distinction

A **data source** supplies geospatial, climate or agronomic information. A **tool** draws polygons, calculates zonal statistics, transforms files, serves APIs or persists data. The app must not conflate them.

**No sensor mandatory.** SoilGrids are modeled property estimates; SMAP soil moisture is coarse; NASA POWER is gridded weather/climate. An AOI polygon does not raise native resolution.

## A. Mapping, user inputs, geometry tools

| Tool | Input | Output | Where / treatment |
|---|---|---|---|
| Browser Geolocation API (permission) | Browser consent | latitude/longitude or error | **Map centering only**, never substitute for field polygon |
| Leaflet | tiles, coordinates, zoom | interactive map | field selection; satellite imagery layer subject to provider licensing |
| Leaflet-Geoman | user clicks/drags | validatable GeoJSON Polygon/MultiPolygon | draw/edit candidate AOI |
| Turf.js or pyproj.Geod | polygon coordinates | geodesic m², hectares | no degree-based planar area |
| FastAPI + Pydantic + Shapely | GeoJSON, answers | validated normalized inputs | prevent invalid geometry / impossible weights |
| SQLite | normalized fields, sources, plans | persistent per-browser fields, versioned plans | only database, no auth account |

## B. Scientific sources — source/inputs/outputs/limits

### 1. NASA POWER — **core, NASA Earth Data**

- Official: https://power.larc.nasa.gov/docs/services/api/application/insights/
- Endpoint family: POWER `Regional Insights` (polygon GeoJSON Feature and start/end plus collection/parameters; exact allowed parameter names must be tested); alternatively POWER Daily Point for reliable fallback, clearly labelled centroid/regional approximation.
- **Input:** validated geometry, date interval, requested parameter codes (e.g., temp, precipitation after checking endpoint compatibility), community and output format.
- **Output:** JSON regional weighted temperature/precip/other climate statistics, possibly derived indicators; store source period, selected variable, unit, region support.
- **Treatment:** parse units/quality flags, calculate seasonal anomalies/heat/drought indicators **only with documented rules**, do not equate single-year weather to climate or a long-term series to a forecast.
- **Decision use:** climate-related crop risk and possible planting windows where locally supported. If down, cached NASA response may be used with visible timestamp.
- **Important:** Regional Insights `collection=variable` is documented and accepts GeoJSON. Confirm particular variable codes and performance for small AOI before implementation; not every daily POWER variable may be exposed identically through all collections.

### 2. FAO GAEZ v5 — **core if data layers prepared**

- Official: https://www.fao.org/land-water/resources/tools/databases/gaez/en ; https://www.fao.org/gaez/en
- **Input to our extraction:** field polygon, crop mapping `crop_id → GAEZ crop/land-utilization-type (LUT)`, irrigation/rainfed, management/input level, climate period, spatial layer/CRS.
- **Output:** previously-modeled suitability, attainable or potential yield, sometimes growing period/calendar and uncertainty linked to scenario.
- **Treatment:** select documented layer with correct scenario, extract raster/zonal value, retain source layer ID and native resolution. Normalize yield units; do NOT sum/average unrelated yield scenarios. Save `gaez_layer_id`, `lut`, `management`, `period`.
- **Decision use:** candidate suitability screening and reference yield comparison—not a real forecast for a specific farm.
- **Not an ordinary POST model:** do not assume GAEZ runs custom SoilGrids/POWER inputs; GAEZ portal largely serves model output layers.
- **Build risk:** specific global crop-layer mapping, access/download and licenses must be validated before demo. Keep a cached documented DEMO AOI export if permitted and properly attributed.

### 3. Crop knowledge team CSV — **core, UNVERIFIED reference**

- **Input:** crop_id + records from `data/crop_knowledge_global_DRAFT.csv` and `data/crop_water_fao56_reference_NOT_GLOBAL.csv`.
- **Output:** scientific name, family/rotation group, provisional tolerance ranges, rooting, nitrogen-fixer trait, feed value, separate provisional Kc reference.
- **Treatment:** parse nulls as null (never zero), check min<=max and provenance, **do not use any month globally**, verify per-crop values with local agronomic sources. Start with reviewed subset; 37 source rows ≠ 37 accepted crops for every field.
- **Decision use:** filter impossible conditions where scientific range has been confirmed; rotation family conflict, feed purpose, candidate explanation.

### 4. ISRIC SoilGrids — **important enhancement**

- Official status: https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html ; WebDAV: https://docs.isric.org/globaldata/soilgrids/WebDav.html
- **Input:** polygon, selected soil depth intervals and soil properties (pH, sand/silt/clay, organic carbon, total nitrogen and others).
- **Output:** predicted gridded property values (~250m) with units/depth, optionally prediction uncertainty.
- **Access:** beta REST service publicly marked paused (2026). **Plan via WebDAV/WCS/GDAL and prepared clipped rasters**; no unchecked assertion that production REST works.
- **Treatment:** confirm scale factors/unit encoding per property, extract zonal values and number of intersected cells; if AOI below source support, mark `regional_estimate`; not a lab test.
- **Decision use:** soil constraints and interpretation, not accurate field NPK diagnosis.

### 5. SMAP L4 SPL4SMGP — **optional enhancement / NASA**

- Docs: https://nsidc.org/data/user-resources/help-center/how-extract-point-and-area-data-samples-using-appeears
- **Input:** AOI, date period, product/layers, Earthdata access/AppEEARS area job.
- **Output:** ~9km 3-hourly soil moisture model estimates including surface/root-zone depending selected layer; files/statistics.
- **Treatment:** asynchronous job with retries, cache period aggregation, native pixel count/support. Small field ≠ direct field root moisture sensor.
- **Decision use:** broad moisture stress context. Do not infer an individual farmer's well/irrigation entitlement.

### 6. Copernicus Sentinel-2 Statistical API — **optional enhancement**

- Docs: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html
- **Input:** polygon, time range, OAuth2, bands `B04` red and `B08` near IR, evalscript, cloud/data mask.
- **Output:** time-series statistical `NDVI=(B08-B04)/(B08+B04)` aggregated within field with valid cloud-free pixel counts.
- **Treatment:** cloud masking, denominators and nan, seasonal bands and resolution. Distinguish crop activity from permanent greenery; NDVI does not identify crop species or quantify NPK.
- **Decision use:** bare-field/vegetation windows and contextual evidence, not substitute for farmer crop history.

### 7. NASA GPM IMERG — **optional NASA rainfall enhancement**

- URL: https://gpm.nasa.gov/data
- **Input:** geographic AOI and dates.
- **Output:** gridded precipitation history/time series, spatially heterogeneous intensity.
- **Treatment:** compare storm/spell variability and NASA POWER rain; avoid making outlier rain direct proof of erosion without slope/soil context.

### 8. ESA WorldCereal — **optional historic cropland**

- URL: https://esa-worldcereal.org/en/products/global-maps
- **Input:** AOI plus available map product/year.
- **Output:** historic cropland activity/temporary-crop context at 10m class maps where coverage/product exists.
- **Treatment:** refer to map product year (e.g., 2021 baseline for global maps); not live crop ID, not field's actual 2026 planting record.

### 9. IFPRI MapSPAM 2020 — **optional reference historical regional yield**

- URL: https://cgiar-climate-data-hub.github.io/catalog/spam2020/
- **Input:** AOI/region, crop code, technology class.
- **Output:** gridded physical area, harvested area, total production, historical **yield**, dataset describes 2020 crop production; 5 arc-min resolution.
- **Treatment:** yield per pixel in `kg/ha`, **weighted average by harvested area** for region; production totals summed; never sum yield values. Convert units carefully.
- **Decision use:** regional historical reference for `GAEZ attainable yield` interpretation. **Never use as market demand or forecast.**

### 10. FAO Crop Calendar — **optional regional calendar**

- URL: https://cropcalendar.apps.fao.org/
- **Input:** country, crop and agroecological zone.
- **Output:** planting/harvest windows for supported country–crop–zone combinations; portal currently covers >100 crops, >50 countries.
- **Treatment:** manual/authorized extraction or cached verified records, no public REST API assumed; no universal month. If absent, show `calendar_unavailable` and do not make up dates.

### 11. CHIRPS v3 / ERA5-Land / HLS / ECOSTRESS / SRTM

- Optional future data connectors: `CHIRPS` historic rain, `ERA5-Land` land reanalysis, `HLS` harmonized optical series, `ECOSTRESS` evapotranspiration/heat, `SRTM` terrain/slope. Integrate only if they answer a specific need and provider access/license and limitations verified. Do not overbuild hackathon MVP.

## C. Proposed processing pipeline

1. `GET user inputs` → normalize and validate field geometry + farm answers; preserve unknown.
2. `Fetch NASA POWER` → log request/response metadata and cache by AOI + time + params.
3. `Fetch/cached GAEZ matching layer` + optional SoilGrids, SMAP, Sentinel-2.
4. `Harmonize`: convert units and dates, join by polygon overlay **without false downscaling**; annotate spatial resolution and source age.
5. `Analyze`: climate risks, provisional soil risks, crop suitability reference, seasonal windows where supported.
6. `Crop Filter`: crops with verified necessary traits and supported local calendar/scenario; separate `hard_infeasible` from `insufficient_data`.
7. `Rotation Generate`: feasible sequences over seasons/years; account for previous 3y and multi-crop seasons, water constraints, cropping purpose and agronomic conflict.
8. `Score` only evidence-supported measures; compare Pareto-type trade-offs, weights sum 100; no unsupported profit or water saving numerical claims.
9. `Evidence`: observation IDs, rule IDs, missing information, scientific notes.
10. `Persist` normalized raw references, analyses, plans/versions in SQLite; frontend displays 3 options.

### Data provenance record (conceptual JSON)

```json
{
  "field_id": "field_example",
  "indicator": "seasonal_precipitation",
  "value": null,
  "unit": "mm",
  "source_id": "nasa_power",
  "source_layer": "to_be_verified",
  "period": ["2020-01-01", "2025-12-31"],
  "spatial_support": "coarse_regional_grid",
  "status": "not_fetched",
  "quality_flags": ["no_measurement_claim"]
}
```

No fabricated non-null numerical values. The range above is an example request period, not verified data availability for a specific parameter.

## D. Operational requirements

- Provider adapter interface: `fetch(geometry, period, configuration) → Result(data, metadata, status, source)`. This is **our** interface, not external SDK guarantee.
- Timeouts, reasonable retry/backoff, quota compliance, async `AnalysisJob`, local cache for demo area with explicit `cached_at`/`data_period`.
- Use real license attribution and provider credentials where required; do not commit secret tokens.
- Clearly separate `connected_live` vs `prepared_dataset` vs `fixture_demo`; scientific scoring cannot silently switch source types.
- Failure policy: essential NASA unavailable and no legitimate cached NASA data → show unable to complete NASA-backed analysis; optional source unavailable → partial view, lower confidence and no unsupported indicator.
