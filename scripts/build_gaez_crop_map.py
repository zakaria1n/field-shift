"""Generate the crop_id -> GAEZ v5 crop-code mapping from the official RES05 catalog."""
import pandas as pd
import os, tempfile

xl = pd.ExcelFile(os.path.join(tempfile.gettempdir(), "readme_res05.xlsx"))
codes = xl.parse("CODES_CROP", header=0, dtype=str)
codes.columns = [c.strip().upper() for c in codes.columns]

# our crop catalog crop_id -> search terms against GAEZ crop names
OUR_CROPS = {
    "bread_wheat": ["wheat"],
    "durum_wheat": ["wheat"],
    "barley": ["barley"],
    "oats": ["oat"],
    "maize": ["maize"],
    "sorghum": ["sorghum"],
    "pearl_millet": ["millet"],
    "faba_bean": ["faba", "broad bean"],
    "chickpea": ["chickpea"],
    "lentil": ["lentil"],
    "pea": ["pea"],
    "green_bean": ["green bean", "common bean", "bean"],
    "alfalfa": ["alfalfa", "lucerne"],
    "berseem": ["berseem", "clover"],
    "vetch": ["vetch"],
    "groundnut": ["groundnut"],
    "sugar_beet": ["sugar beet"],
    "potato": ["potato"],
    "sweet_potato": ["sweet potato"],
    "carrot": ["carrot"],
    "onion": ["onion"],
    "garlic": ["garlic"],
    "tomato": ["tomato"],
    "pepper": ["pepper"],
    "eggplant": ["eggplant", "aubergine"],
    "melon": ["melon"],
    "watermelon": ["watermelon"],
    "cucumber": ["cucumber"],
    "zucchini": ["zucchini", "squash", "pumpkin"],
    "cabbage": ["cabbage"],
    "lettuce": ["lettuce"],
    "spinach": ["spinach"],
    "canola": ["rapeseed", "canola"],
    "sunflower": ["sunflower"],
    "safflower": ["safflower"],
    "quinoa": ["quinoa"],
    "artichoke": ["artichoke"],
}

for our_id, terms in OUR_CROPS.items():
    hits = []
    for term in terms:
        m = codes[codes["CROP"].astype(str).str.lower().str.contains(term, na=False)]
        for _, r in m.iterrows():
            hits.append(f"{r['CODE']}={r['CROP']}")
    print(f"{our_id}: {hits[:6] if hits else 'NO MATCH'}")
