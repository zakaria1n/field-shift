import pandas as pd
import os, tempfile

xl = pd.ExcelFile(os.path.join(tempfile.gettempdir(), "readme_res05.xlsx"))
print("sheets:", xl.sheet_names)
for sheet in xl.sheet_names:
    raw = xl.parse(sheet, header=None, nrows=6)
    print(f"\n== {sheet} (first rows) ==")
    print(raw.iloc[:4, :7].to_string(max_colwidth=24))
