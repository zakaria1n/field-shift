from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
UI=ROOT/'ui_reference';screens=UI/'screens';screens.mkdir(parents=True,exist_ok=True)
NAMES=['01_welcome','02_select_field','03_farm_questions','04_priority_mixer','05_analysis_progress','06_rotation_explorer','07_plan_details','08_crop_customizer','09_evaluation_progress','10_compare_changes','11_confirm_plan','12_returning_home','13_rotation_timeline','14_field_insights','15_plan_management','16_settings']
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1440,'height':900},device_scale_factor=1)
 for idx,name in enumerate(NAMES):
  page.set_content((UI/'preview.html').read_text(encoding='utf-8'), wait_until='load')
  page.evaluate('(name) => { window.__SCREEN_NAME=name; render(); }', name)
  page.screenshot(path=str(screens/(name+'.png')),full_page=True)
  print('Rendered',name)
 page.set_content((UI/'preview.html').read_text(encoding='utf-8'), wait_until='load')
 page.evaluate("() => { window.__SCREEN_NAME='12_returning_home'; window.__AR_MODE=true; render(); }")
 page.screenshot(path=str(screens/'17_arabic_rtl_home_layout_example.png'),full_page=True)
 b.close()
# Contact sheet for rapid inspection
thumbs=[]
for i,name in enumerate(NAMES):
 im=Image.open(screens/(name+'.png')).convert('RGB')
 im.thumbnail((500,340))
 bg=Image.new('RGB',(520,385),'#f6f7f1');bg.paste(im,((520-im.width)//2,33))
 d=ImageDraw.Draw(bg);d.text((13,8),f'{i+1:02d}  {name.replace("_"," ")}',fill='#173e32')
 thumbs.append(bg)
contact=Image.new('RGB',(520*4,385*4),'#ffffff')
for i,im in enumerate(thumbs):contact.paste(im,((i%4)*520,(i//4)*385))
contact.save(UI/'all_screens_contact_sheet.png',quality=95)
print('PNG count',len(list(screens.glob('*.png'))))
