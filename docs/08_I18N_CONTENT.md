# 08 — Multilingual web UI content (EN / Arabic)

## Supported locales

- `en` — English, default for international hackathon demo.
- `ar` — Arabic, full RTL layout. Use clear Modern Standard Arabic for interface; Darija explanation may be supported later but is not a third locale in MVP.
- No login/account-based locale preferences. Locale saved in `localStorage` and optionally passed to backend for exported descriptions; crop IDs remain language-independent.

## Source of labels

`../data/ui_i18n_en_ar.csv` contains seed keys and bilingual text. Application can compile into `src/i18n/en.json`, `src/i18n/ar.json`; expand translations for validation/errors/ARIA.

### Examples

| Key | English | Arabic |
|---|---|---|
| app.title | Field Shift | فيلد شيفت |
| field.select | Select your field | حدد أرضك |
| farm.question.history | What crops did you grow over the last three years? | شنو زرعتي فآخر ثلاث سنوات؟ |
| analysis.title | Analyzing your field | جارٍ تحليل الأرض |
| plan.evaluate | Evaluate changes | تقييم التعديلات |
| plan.keep_original | Keep original | الاحتفاظ بالأصلية |
| home.welcome | Welcome back | مرحباً بعودتك |

## Implementation rules

- Root should switch language+direction: `<html lang="ar" dir="rtl">`, but use proper CSS logical properties throughout. For English, `dir="ltr"`.
- Use isolation for mixed identifiers: `<bdi>NASA POWER</bdi>`, `NDVI`, `mm`, `ha`, `t/ha`, `2026` as appropriate; do not force arbitrary nested RTL everywhere.
- Directional arrows and back/forward button symbols follow navigation direction; numbers and map coordinates retain mathematical direction.
- No hardcoded 'November is wheat season' string. Seasonal labels derived from date/zone data, or unknown.
- Crop display from stable `crop_id`, `name_en` / `name_ar`, fall back to scientific name if translation absent. No translation of IDs or datasets.
- Accessible help describes technical terms: `Suitability = estimated fit with model/scenario`, `Yield reference = modeled attainable yield, not harvest prediction`.
- `Not available` must be localized and meaningful; avoid empty numerical placeholder interpreted as zero.
- Localized numeric formatting should not alter backend unit contracts. Backend returns SI units and ISO timestamps; frontend formats.
- Screenshots in this pack use some English UI text for readability; implement translations from locale strings, not screenshot OCR.

## Key English copy for scientific safeguards

- `Soil data are estimated from a global map, not a laboratory test.`
- `This crop calendar is not available for your location. We will not guess planting dates.`
- `Yield is a model-based reference under specified management, not a prediction of your harvest.`
- `Your selected plan is saved in this browser. There is no login or cross-device sync.`
- `Profit/market forecasts are not available in this version.`
- `Similarity is based on re-evaluating the whole rotation; crops are not identical.`

Translate all to Arabic before delivery; include as tooltip/modal text in proper locations.
