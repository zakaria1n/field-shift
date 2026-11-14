# 10 — Sources, references and attribution

## Official challenge and team context

- NASA Space Apps Challenge 2026 Field Shift: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/
- NASA Space Apps 2026 event/submission: https://www.spaceappschallenge.org/2026/
- Team guide (English, 14 pages): `../references/Team_Guide_EN_Original.pdf`, Nov 13 2026; Part A (agriculture), Part B (challenge/problem/sources), Part C (glossary).
- Team guide Arabic (9 pages): `../references/Team_Guide_AR_Original.pdf`.
- Team 37-crop CSV (original): `../data/original_team_crop_knowledge_UNVERIFIED.csv`; per-row quantitative values NOT independently verified.

## Official data documentation

1. NASA POWER Regional Insights polygon API: https://power.larc.nasa.gov/docs/services/api/application/insights/
2. FAO GAEZ official database and methodology: https://www.fao.org/land-water/resources/tools/databases/gaez/en
3. GAEZ v5 model overview: https://www.fao.org/gaez/en
4. SoilGrids current API status: https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html
5. SoilGrids WebDAV raster access: https://docs.isric.org/globaldata/soilgrids/WebDav.html
6. NSIDC AppEEARS SMAP product sampling: https://nsidc.org/data/user-resources/help-center/how-extract-point-and-area-data-samples-using-appeears
7. Copernicus Sentinel Hub Statistical API: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html
8. NASA GPM: https://gpm.nasa.gov/data
9. ESA WorldCereal: https://esa-worldcereal.org/en/products/global-maps
10. CGIAR MapSPAM 2020 v2r2 metadata & licensing: https://cgiar-climate-data-hub.github.io/catalog/spam2020/
11. FAO Crop Calendar: https://cropcalendar.apps.fao.org/
12. CHIRPS v3: https://www.chc.ucsb.edu/data/chirps3
13. FAO Irrigation and Drainage Paper 56: https://www.fao.org/4/x0490e/x0490e00.htm
14. Browser Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
15. Leaflet: https://leafletjs.com/ ; Leaflet-Geoman: https://geoman.io/

## Use of third-party software and data

- Open data still has license, citation, attribution and usage limits; each adapter must include a license/terms review before deployment.
- All screenshots are conceptual UI references. Their satellite/aerial imagery and logos in AI-generated boards may be illustrative, not licensed ready-to-use map tile assets. Replace with a properly licensed imagery provider and legally appropriate logo attribution.
- `MapSPAM 2020 v2r2` catalog identifies a CC BY-SA 4.0 dataset; consult asset-specific terms before creating redistributed copies.
- `ESA WorldCereal`, `NASA Earthdata`, `Copernicus Data Space`, `SoilGrids`, `GAEZ` each must be attributed as their documentation instructs. Do not suggest official NASA affiliation.
- No web scraping in the current MVP. Later scraping requires permission/terms, rate limits and provenance.

## Evidence methodology

For every exported scientific indicator record, keep source and product/layer ID, query geometry/period, original unit, transformed unit, temporal support, spatial resolution, access time, status (`live/cached/demo/unknown`) and limitations. This permits ethical source citations in the user UI.

## What was actually verified while assembling this ZIP

- NASA POWER Regional Insights docs accept Polygon/MultiPolygon as GeoJSON Feature and describe weighted regional statistics.
- Official FAO GAEZ portal lists crop suitability/attainable yield data under specified crop and management scenarios.
- ISRIC documentation announces SoilGrids REST paused and documents alternative WebDAV/Web Services access.
- Copernicus Statistical API accepts AOI/time/evalscript and returns aggregated band/NDVI statistics.
- FAO Crop Calendar publicly documents country/agroecological-zone coverage; not a globally guaranteed direct API.
- MapSPAM 2020 describes historical modeled area, production and yield and warns of grid-level limits.

**Not verified:** the team's individual 37 crop numeric agronomic values, every provider credential/endpoint response, every layer needed for a Morocco demo, and actual code execution of the proposed application. Those remain implementation tasks, not facts.
