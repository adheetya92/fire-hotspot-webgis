import csv
import io
import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone

MAP_KEY = os.environ.get("FIRMS_MAP_KEY")
if not MAP_KEY:
    raise RuntimeError("FIRMS_MAP_KEY is not set. Add it as a GitHub Actions secret.")

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
        headers={"User-Agent": "fire-hotspot-webgis/1.1"},
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            status = response.status
            content_type = response.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:1000]
        raise RuntimeError(
            f"NASA FIRMS HTTP {e.code} for {source}. Response: {body}"
        ) from e
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Could not connect to NASA FIRMS for {source}: {e.reason}"
        ) from e

    text = raw.decode("utf-8-sig", errors="replace").strip()

    if not text:
        raise RuntimeError(f"NASA FIRMS returned an empty response for {source}.")

    # NASA should return CSV. If an API error is returned as plain text/HTML,
    # fail loudly instead of silently producing an empty GeoJSON.
    first_line = text.splitlines()[0].strip().lower()
    if "<html" in first_line or "<!doctype" in first_line:
        raise RuntimeError(
            f"NASA FIRMS returned HTML instead of CSV for {source}."
        )

    if "error" in first_line and "latitude" not in first_line:
        raise RuntimeError(
            f"NASA FIRMS returned an error for {source}: {first_line}"
        )

    print(
        f"{source}: HTTP {status}, {len(raw)} bytes, "
        f"Content-Type={content_type or 'unknown'}"
    )

    return text


def make_feature(row):
    try:
        lon = float(row["longitude"])
        lat = float(row["latitude"])
    except (KeyError, ValueError, TypeError):
        return None

    properties = dict(row)

    for key in (
        "latitude",
        "longitude",
        "frp",
        "bright_ti4",
        "bright_ti5",
        "scan",
        "track",
    ):
        if key in properties:
            try:
                properties[key] = float(properties[key])
            except (ValueError, TypeError):
                pass

    return {
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat],
        },
        "properties": properties,
    }


def main():
    features = []
    seen = set()
    total_rows = 0

    for source in SOURCES:
        print(f"Downloading {source}...")
        text = fetch_csv(source)

        reader = csv.DictReader(io.StringIO(text))

        if not reader.fieldnames:
            raise RuntimeError(
                f"{source}: CSV has no header. First 500 chars: {text[:500]}"
            )

        required = {"latitude", "longitude"}
        missing = required - set(reader.fieldnames)
        if missing:
            raise RuntimeError(
                f"{source}: CSV is missing columns: {sorted(missing)}. "
                f"Columns returned: {reader.fieldnames}"
            )

        source_rows = 0
        source_features = 0

        for row in reader:
            total_rows += 1
            source_rows += 1

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
            source_features += 1

        print(
            f"{source}: CSV rows={source_rows}, "
            f"valid unique features={source_features}"
        )

    generated_at = datetime.now(timezone.utc).isoformat()

    output = {
        "type": "FeatureCollection",
        "generated_at": generated_at,
        "metadata": {
            "source": "NASA FIRMS",
            "sources": SOURCES,
            "area": AREA,
            "day_range": 1,
            "feature_count": len(features),
        },
        "features": features,
    }

    # Do not silently publish an empty dataset. An empty response can be valid
    # in rare circumstances, but for this WebGIS it is much safer to fail so
    # GitHub Actions does not overwrite working data with an empty file.
    if not features:
        raise RuntimeError(
            "NASA FIRMS returned zero valid hotspot features. "
            "The previous GeoJSON will not be overwritten."
        )

    output_dir = os.path.dirname(OUTPUT)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    print(
        f"Wrote {len(features)} hotspot features to {OUTPUT}. "
        f"Total CSV rows processed: {total_rows}"
    )


if __name__ == "__main__":
    main()
