import csv
import io
import json
import os
import urllib.request
from datetime import datetime, timezone

MAP_KEY = os.environ["FIRMS_MAP_KEY"]

# Indonesia bounding box: west, south, east, north
AREA = "94.5,-11.5,141.5,6.5"

SOURCES = [
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
]

OUTPUT = "data/hotspots.geojson"

def fetch_csv(source):
    url = (
        "https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{MAP_KEY}/{source}/{AREA}/1"
    )
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "fire-hotspot-webgis/1.0"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8")

def make_feature(row):
    try:
        lon = float(row["longitude"])
        lat = float(row["latitude"])
    except (KeyError, ValueError):
        return None

    properties = dict(row)

    # Keep numeric values numeric where possible.
    for key in ("latitude", "longitude", "frp", "bright_ti4", "bright_ti5",
                "scan", "track"):
        if key in properties:
            try:
                properties[key] = float(properties[key])
            except (ValueError, TypeError):
                pass

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": properties
    }

def main():
    features = []
    seen = set()

    for source in SOURCES:
        print(f"Downloading {source}...")
        text = fetch_csv(source)

        for row in csv.DictReader(io.StringIO(text)):
            feature = make_feature(row)
            if feature is None:
                continue

            p = feature["properties"]

            # Practical deduplication key.
            key = (
                p.get("acq_date"),
                p.get("acq_time"),
                p.get("latitude"),
                p.get("longitude"),
                p.get("satellite"),
            )

            if key in seen:
                continue

            seen.add(key)
            features.append(feature)

    generated_at = datetime.now(timezone.utc).isoformat()

    output = {
        "type": "FeatureCollection",
        "generated_at": generated_at,
        "metadata": {
            "source": "NASA FIRMS",
            "sources": SOURCES,
            "area": AREA,
            "day_range": 1
        },
        "features": features
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"Wrote {len(features)} hotspot features to {OUTPUT}")

if __name__ == "__main__":
    main()
