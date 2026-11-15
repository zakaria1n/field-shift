"""Live validation: read a small window from a public GAEZ v5 COG via /vsicurl/."""
import rasterio

url = "https://storage.googleapis.com/fao-gismgr-gaez-v5-data/DATA/GAEZ-V5/MAPSET/RES05-YXX/GAEZ-V5.RES05-YXX.HP0120.AGERA5.HIST.BRL.HILM.tif"
with rasterio.open("/vsicurl/" + url) as src:
    print("CRS:", src.crs)
    print("size:", src.width, "x", src.height, "| res:", src.res)
    print("bounds:", src.bounds)
    print("nodata:", src.nodata)
    print("desc:", src.descriptions)
    # window around Meknes (lon -5.56..-5.54, lat 33.89..33.91)
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds
    b = transform_bounds("EPSG:4326", src.crs, -5.56, 33.89, -5.54, 33.91, densify_pts=21)
    print("window bounds (layer CRS):", tuple(round(v, 1) for v in b))
    win = from_bounds(*b, transform=src.transform)
    data = src.read(1, window=win)
    print("window shape:", data.shape)
    valid = data[data != src.nodata] if src.nodata is not None else data.ravel()
    if len(valid):
        print("min/max/mean:", int(valid.min()), int(valid.max()), round(float(valid.mean()), 1))
    else:
        print("all nodata in window")
