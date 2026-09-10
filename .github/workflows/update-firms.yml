import csv
import io
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

MAP_KEY = os.environ["FIRMS_MAP_KEY"]

# Indonesia bounding box: west, south, east, north
AREA = "94.5,-11.5,141.5,6.5"

# FIRMS NRT data for "today" often isn't processed yet for the first few
# hours of the day (day_range=1 can legitimately return zero rows during
# that gap). Requesting 2 days gives us yesterday's data as a fallback so
# the map is never empty just because today's batch hasn't landed yet.
# Deduplication in main() prevents the overlap from creating duplicates.
DAY_RANGE = 2

SOURCES = [
    "VIIRS_NOAA20_NRT",
    "VIIRS_NOAA21_NRT",
]

OUTPUT = "data/hotspots.geojson"

# Columns that MUST be present for a response to be treated as a real
# FIRMS CSV. FIRMS sometimes answers with HTTP 200 but a plain-text error
# body (e.g. invalid MAP_KEY, exhausted transaction quota) instead of an
# HTTP error status, so the status code alone can't be trusted.
REQUIRED_COLUMNS = {
    "latitude", "longitude", "acq_date", "acq_time",
    "confidence", "satellite",
}


class FirmsSourceError(RuntimeError):
    """Raised when a single FIRMS source can't be trusted."""


def fetch_csv(source):
    url = (
        "https://firms.modaps.eosdis.nasa.gov/api/area/csv/"
        f"{MAP_KEY}/{source}/{AREA}/{DAY_RANGE}"
    )
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "fire-hotspot-webgis/1.0"}
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "unknown")
            raw = response.read()
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")[:300]
        raise FirmsSourceError(
            f"{source}: HTTP {error.code} from FIRMS. Body preview: {body!r}"
        ) from error
    except urllib.error.URLError as error:
        raise FirmsSourceError(
            f"{source}: network error contacting FIRMS: {error.reason}"
        ) from error

    text = raw.decode("utf-8", errors="replace")

    print(
        f"{source}: HTTP {status}, {len(raw)} bytes, "
        f"Content-Type={content_type}"
    )

    if status != 200:
        raise FirmsSourceError(f"{source}: unexpected HTTP status {status}")

    return validate_csv(source, text)


def validate_csv(source, text):
    """Make sure `text` actually looks like a FIRMS CSV before trusting it.

    FIRMS error messages (bad MAP_KEY, no transactions left, invalid
    source/area, etc.) typically come back as a short line of plain text
    with HTTP 200, so we check the header row instead of relying on the
    status code.
    """

    reader = csv.DictReader(io.StringIO(text))
    fieldnames = set(reader.fieldnames or [])

    if not REQUIRED_COLUMNS.issubset(fieldnames):
        preview = text.strip().splitlines()[:3]
        raise FirmsSourceError(
            f"{source}: response is not a valid FIRMS CSV "
            f"(missing columns {sorted(REQUIRED_COLUMNS - fieldnames)}). "
            f"Response preview: {preview!r}"
        )

    return list(reader)

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

        # Raises FirmsSourceError if the HTTP status, Content-Type, or CSV
        # header don't look like a real FIRMS response.
        rows = fetch_csv(source)

        valid_before = len(features)

        for row in rows:
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

        valid_added = len(features) - valid_before

        print(
            f"{source}: CSV rows={len(rows)}, "
            f"valid unique features={valid_added}"
        )

    # A structurally valid CSV can still legitimately contain zero
    # detections for one satellite pass. What we must never do is silently
    # overwrite good historical data with an empty FeatureCollection, so we
    # only fail once *every* source combined produced nothing.
    if not features:
        raise FirmsSourceError(
            "All FIRMS sources returned 0 valid features. Refusing to "
            f"overwrite {OUTPUT} with an empty FeatureCollection."
        )

    generated_at = datetime.now(timezone.utc).isoformat()

    output = {
        "type": "FeatureCollection",
        "generated_at": generated_at,
        "metadata": {
            "source": "NASA FIRMS",
            "sources": SOURCES,
            "area": AREA,
            "day_range": DAY_RANGE
        },
        "features": features
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"Wrote {len(features)} hotspot features to {OUTPUT}")

if __name__ == "__main__":
    main()
