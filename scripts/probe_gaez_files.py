import pandas as pd
import os, tempfile

xl = pd.ExcelFile(os.path.join(tempfile.gettempdir(), "readme_res05.xlsx"))
raw = xl.parse("LIST_FILES", header=0, dtype=str)
raw.columns = [c.strip().upper() for c in raw.columns]
print("rows:", len(raw), "| columns:", list(raw.columns))
print("\nvariables:", raw["VARIABLE"].unique())

# crop codes
codes = xl.parse("CODES_CROP", header=0, dtype=str)
print("\ncrops (first 12):")
print(codes.head(12).to_string())

# attainable yield for wheat, historical 2001-2020, rainfed vs low input
wheat_codes = codes[codes.apply(lambda r: r.astype(str).apply(str.lower).str.contains("wheat").any(), axis=1)]
print("\nwheat crop codes:", wheat_codes.iloc[:, 0].tolist())

for var in raw["VARIABLE"].unique():
    sub = raw[(raw["VARIABLE"] == var)]
    print(f"\n{var}: {len(sub)} files | periods: {sub['PERIOD'].unique()} | crops n={sub['CROP'].nunique()}")
    print(" sample FILE col?:", [c for c in raw.columns if "FILE" in c.upper()])
    break
