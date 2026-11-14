from pathlib import Path
import csv, unicodedata
ROOT=Path(__file__).parent
DATA=ROOT/'data'
src=DATA/'original_team_crop_knowledge_UNVERIFIED.csv'
with src.open(newline='',encoding='utf-8-sig') as f:
 rows=list(csv.DictReader(f))

def write(filename,headers, records):
 with (DATA/filename).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,headers,extrasaction='ignore');w.writeheader();w.writerows(records)

# We deliberately keep the unreviewed agronomic ranges as provisional, never certified.
selected=['crop_id','name_en','name_ar','scientific_name','ecocrop_family','rotation_group',
 'temp_opt_min_c','temp_opt_max_c','temp_abs_min_c','temp_abs_max_c',
 'rain_opt_min_mm','rain_opt_max_mm','rain_abs_min_mm','rain_abs_max_mm',
 'ph_opt_min','ph_opt_max','ph_abs_min','ph_abs_max',
 'growing_days_min','growing_days_max','soil_texture_opt','soil_depth_opt',
 'soil_fertility_opt','salinity_tol_opt','drainage_opt','photoperiod',
 'root_depth_min_m','root_depth_max_m','fixes_nitrogen','animal_feed']
extra=['calendar_rule_id','calendar_status','agronomic_review_status','is_allowed_as_universal_hard_filter','source_note']
new=[]
for r in rows:
 d={k:r.get(k,'') for k in selected}
 d.update(calendar_rule_id='',calendar_status='requires_country_zone_crop_management_mapping',
          agronomic_review_status='unverified_team_reference',is_allowed_as_universal_hard_filter='false',
          source_note='Adapted from original_team_crop_knowledge_UNVERIFIED.csv; not independently validated; regional conditions apply')
 new.append(d)
write('crop_knowledge_global_DRAFT.csv',selected+extra,new)

water_cols=['crop_id','name_en','kc_ini','kc_mid','kc_end','kc_printed','kc_ini_from','stage_init_days','stage_dev_days','stage_mid_days','stage_late_days','season_total_days','depletion_p','fao56_crop_row','source_example_region','source_example_plant_month','scope','is_globally_applicable','review_status']
water=[]
for r in rows:
 x={k:r.get(k,'') for k in water_cols}
 x.update(source_example_region=r['fao56_stage_region'],source_example_plant_month=r['fao56_plant_month'],scope='FAO56 example row / region-specific reference, not a worldwide local planting calendar',is_globally_applicable='false',review_status='requires_country_zone_variety_irrigation_validation')
 water.append(x)
write('crop_water_fao56_reference_NOT_GLOBAL.csv',water_cols,water)

calendar_cols=['calendar_rule_id','country_iso2','agroecological_zone_id','crop_id','cropping_system','irrigation_type','planting_start_month','planting_end_month','harvest_start_month','harvest_end_month','hemisphere','source_name','source_url','source_year','review_status','notes']
write('crop_calendar_by_zone_EMPTY_TEMPLATE.csv',calendar_cols,[])

issues=[]
for r in rows:
 crop=r['crop_id']
 if r['fao56_plant_month']:
  issues.append(dict(crop_id=crop,severity='HIGH',field='fao56_plant_month',issue='Region-specific example month incorrectly interpretable as global month',action='Excluded from globally applicable crop table; retained ONLY in FAO-56 regional reference',source='Original team CSV'))
 if r['kc_ini_from']=='FAO-56 crop group header':
  issues.append(dict(crop_id=crop,severity='MEDIUM',field='kc_ini_from',issue='Kc based on crop-group header rather than crop-specific measurement',action='Require verification for local variety and management before crop water calculations',source='Original team CSV'))
 if all(r[k] for k in ['growing_days_min','growing_days_max','season_total_days']):
  a,b,s=map(float,(r['growing_days_min'],r['growing_days_max'],r['season_total_days']))
  if not a<=s<=b:
   issues.append(dict(crop_id=crop,severity='HIGH',field='season_total_days',issue=f'FAO56 example season length {s:g} days outside ecological growth range [{a:g}, {b:g}] days',action='Do not merge timescales; review location, cultivar and definition; not used for fixed global season',source='Original team CSV'))
 if any(not r[k] for k in ['ph_abs_min','ph_abs_max','temp_abs_min_c','temp_abs_max_c','rain_abs_min_mm','rain_abs_max_mm']):
  issues.append(dict(crop_id=crop,severity='MEDIUM',field='ecocrop_ranges',issue='Missing one or more absolute ecological range fields',action='Treat unknown as unknown; do not impute zero; review source',source='Original team CSV'))
 issues.append(dict(crop_id=crop,severity='HIGH',field='all_agronomic_ranges',issue='Team-supplied reference not independently verified line-by-line',action='Treat as candidate guidance; require domain review before automated exclusion',source='Original team CSV'))
write('crop_data_audit.csv',['crop_id','severity','field','issue','action','source'],issues)

registry=[
 ('browser_geolocation','Browser Geolocation API','Optional map centering','navigator.geolocation consent','lat/lon','web','optional','No farm location inferred','https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API'),
 ('leaflet_geoman','Leaflet + Leaflet-Geoman','Draw polygon','map clicks/edit','GeoJSON Polygon','web','core','Area must be geodesic and geometry validated','https://geoman.io/'),
 ('nasa_power','NASA POWER Regional Insights','AOI climate','GeoJSON Feature, dates, variable names','JSON regional climate variables','API','core','Coarse grid; test endpoint and variable params','https://power.larc.nasa.gov/docs/services/api/application/insights/'),
 ('gaez_v5','FAO GAEZ v5','Reference suitability, yield, calendar','AOI, crop/LUT, management, climate period','GIS suitability and attainable-yield layer','download/cached layers','core_if_prepared','Not a custom soil/climate model execution API','https://www.fao.org/land-water/resources/tools/databases/gaez/en'),
 ('crop_csv','Team crop knowledge CSV','Crop traits, families, ranges','crop_id','Agronomic provisional reference','local CSV','core','37 crops not agronomically validated','data/crop_knowledge_global_DRAFT.csv'),
 ('soilgrids','ISRIC SoilGrids','Soil property estimates','AOI, depths, properties','Raster values + uncertainty where available','WCS/WebDAV','enhancement','REST paused; 250m predictions not lab values','https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html'),
 ('smap_l4','NASA SMAP L4 / AppEEARS','Regional root-zone moisture','AOI, dates, SPL4SMGP product','3-hourly ~9km modeled moisture','AppEEARS request + download','enhancement','Not field-level moisture; Earthdata credentials and async jobs','https://nsidc.org/data/user-resources/help-center/how-extract-point-and-area-data-samples-using-appeears'),
 ('sentinel2','Copernicus Sentinel-2 Statistics','NDVI phenology/green cover','Polygon, dates, evalscript, cloud mask','NDVI time series JSON','OAuth2 API','enhancement','Requires account/quotas; clouds/phenology not exact crop ID','https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Statistical.html'),
 ('gpm_imerg','NASA GPM IMERG','Rainfall variability','AOI, date range','gridded precipitation','download/Giovanni','optional','Resolution not farm-meter; verify processing','https://gpm.nasa.gov/data'),
 ('worldcereal','ESA WorldCereal','Historic cropland context','AOI, available reference map','Landcover/cropland classes','raster','optional','2021 baseline not live crop ID','https://esa-worldcereal.org/en/products/global-maps'),
 ('mapspam','IFPRI MapSPAM 2020','Regional historical yield context','AOI, crop/technology','area, harvest, production, yield','Zarr/COG download','optional','2020 modeled regional != current demand','https://cgiar-climate-data-hub.github.io/catalog/spam2020/'),
 ('cropcalendar','FAO Crop Calendar','Local zone crop planting windows','country, crop, zone','region-specific crop windows','portal/manual','optional','Not global/universal API','https://cropcalendar.apps.fao.org/'),
 ('chirps','CHIRPS v3','Rainfall verification','region, dates','historical gridded precipitation','download','optional','Near-global land 60S–60N; not universal','https://www.chc.ucsb.edu/data/chirps3'),
]
write('source_registry.csv',['source_id','source_name','project_use','input','output','access','priority','limitations','url'],[dict(zip(['source_id','source_name','project_use','input','output','access','priority','limitations','url'],r)) for r in registry])

labels=[
 ('app.title','Field Shift','فيلد شيفت'),('nav.home','Home','الرئيسية'),('nav.fields','My Fields','حقولي'),('nav.plan','My Plan','خطتي'),('nav.insights','Insights','المؤشرات'),
 ('welcome.start','Analyze my field','حلّل أرضي'),('field.select','Select your field','حدد أرضك'),('field.search','Search for a location','ابحث عن منطقة'),('field.draw','Draw field boundary','ارسم حدود الأرض'),('field.confirm','Confirm field','تأكيد الأرض'),('field.name','Field name','اسم الأرض'),
 ('farm.question.water','How is your field irrigated?','كيفاش كتسقي الأرض؟'),('farm.rainfed','Rain-fed','بورية'),('farm.irrigated','Irrigated','سقوية'),('farm.mixed','Mixed','مختلطة'),('farm.unknown','I do not know','ما عارفش'),
 ('farm.question.history','What crops did you grow over the last three years?','شنو زرعتي فآخر ثلاث سنوات؟'),('farm.history.fallow','Fallow / no crop','راحة / ما تزَرع والو'),
 ('goals.water','Save water','توفير الماء'),('goals.soil','Soil health','صحة التربة'),('goals.yield','Yield potential','المردودية الممكنة'),('goals.risk','Climate risk','المخاطر المناخية'),
 ('goals.money','Selling / income objective (not scored in MVP)','هدف البيع / الدخل (خارج التنقيط حالياً)'),('analysis.start','Analyze my field','ابدأ تحليل الأرض'),('analysis.title','Analyzing your field','جارٍ تحليل الأرض'),
 ('plan.title','Rotation plans','الخطط الزراعية'),('plan.details','View plan details','عرض تفاصيل الخطة'),('plan.use','Use this plan','اعتماد الخطة'),('plan.customize','Customize plan','تعديل الخطة'),
 ('plan.evaluate','Evaluate changes','تقييم التعديلات'),('plan.keep_original','Keep original','الاحتفاظ بالأصلية'),('plan.use_modified','Use modified plan','اعتماد الخطة المعدلة'),
 ('plan.saved','Your plan was saved','تم حفظ خطتك'),('home.welcome','Welcome back','مرحباً بعودتك'),('status.estimated','Estimated from external data','تقدير من بيانات خارجية'),('status.missing','Data unavailable','البيانات غير متوفرة')]
write('ui_i18n_en_ar.csv',['key','en','ar'],[dict(zip(['key','en','ar'],x)) for x in labels])
print('CSV outputs:',*[p.name for p in DATA.glob('*.csv')],sep='\n  ')
print('Input rows:',len(rows),'audit rows:',len(issues))
