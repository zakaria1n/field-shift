"""Live validation: SoilGrids WebDAV tile sampling for a field near Meknes."""
import io
import xml.etree.ElementTree as ET

import httpx
import rasterio
from pyproj import CRS, Transformer

VRT_URL = "https://files.isric.org/soilgrids/latest/data/phh2o/phh2o_5-15cm_mean.vrt"
TILE_BASE = "https://files.isric.org/soilgrids/latest/data/phh2o/"

# 1. fetch + parse VRT
r = httpx.get(VRT_URL, timeout=120)
print("VRT:", r.status_code, len(r.content), "bytes")
root = ET.fromstring(r.content)
ns = {"vrt": "http://www gdal org".replace(" ", ".")}  # namespace-agnostic via wildcard
gt = [float(x) for x in root.find("GeoTransform").text.split(",")]
origin_x, res_x = gt[0], gt[1]
origin_y, res_y = gt[3], gt[5]
print("origin/res:", origin_x, res_x, origin_y, res_y)

entries = []
for src in root.iter("ComplexSource"):
    fn = src.find("SourceFilename").text
    rect = src.find("DstRect")
    entries.append((fn, int(rect.get("xOff")), int(rect.get("yOff")),
                    int(rect.get("xSize")), int(rect.get("ySize"))))
print("entries:", len(entries))

# 2. transform Meknes centroid to IGH
crs = CRS.from_proj4("+proj=igh +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs")
t = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
x, y = t.transform(-5.55, 33.9)
col = int((x - origin_x) / res_x)
row = int((y - origin_y) / res_y)
print("pixel col/row:", col, row)

# 3. find covering tile(s)
hits = [e for e in entries if e[1] <= col < e[1] + e[3] and e[2] <= row < e[2] + e[4]]
print("covering tiles:", [(h[0], h[1], h[2]) for h in hits])

# 4. download tile + read pixel
fn, xoff, yoff, w, h = hits[0]
tile_url = TILE_BASE + fn.lstrip("./")
print("tile url:", tile_url)
tr = httpx.get(tile_url, timeout=120)
print("tile:", tr.status_code, len(tr.content), "bytes")
with rasterio.open(io.BytesIO(tr.content)) as tsrc:
    print("tile crs:", tsrc.crs, "| size:", tsrc.width, tsrc.height, "| nodata:", tsrc.nodata)
    lcol = col - xoff
    lrow = row - yoff
    val = tsrc.read(1)[lrow, lcol]
    print("raw phh2o (x10):", int(val), "-> pH", int(val) / 10)
