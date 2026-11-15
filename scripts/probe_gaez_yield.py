import pandas as pd
import os, tempfile

xl = pd.ExcelFile(os.path.join(tempfile.gettempdir(), "readme_res05.xlsx"))
codes_var = xl.parse("CODES_VARIABLE", header=0, dtype=str)
print(codes_var.to_string(max_colwidth=60))

codes = xl.parse("CODES_CROP", header=0, dtype=str)
mask = codes.apply(lambda r: r.astype(str).str.contains("wheat|faba|lentil|chick|barley|onion|cabbage|maize", case=False, na=False).any(), axis=1)
print("\nrelevant crop codes:")
print(codes[mask].to_string())

files = xl.parse("LIST_FILES", header=0, dtype=str)
files.columns = [c.strip().upper() for c in files.columns]
# attainable yield for wheat historical baseline
for crop in ["WWH", "BRL"]:
    sub = files[(files["CROP"] == crop) & (files["VARIABLE"].isin(["YXX", "YLX", "YXX30AS"])) & (files["PERIOD"] == "HP0120")]
    if len(sub):
        print(f"\n{crop} yield files (HP0120):")
        print(sub.head(6).to_string(max_colwidth=50))
