"""Convert data/hotspots.geojson into data/hotspots.kml.

Avenza Maps (the mobile app) does not accept GeoJSON as an importable
Map Feature layer -- it only accepts KML/KMZ, GPX, Shapefile (Pro), and
GeoPackage (Pro). This script produces a KML file with the same points
so the hotspot layer can be imported into Avenza via "Import Layers" ->
"From the Web", using the GitHub Pages URL of the output file.

Placemarks are color-coded by FIRMS confidence (low/nominal/high) to
match the colors already used in js/app.js, and every FIRMS attribute
is kept as <ExtendedData> so it's visible when a user taps a point in
Avenza.
"""

import json
import os
from datetime import datetime, timezone
from xml.sax.saxutils import escape

INPUT = "data/hotspots.geojson"
OUTPUT = "data/hotspots.kml"

# Same palette as js/app.js's hotspotLayer style, translated to KML's
# aabbggrr color order (KML colors are AABBGGRR, not RRGGBB).
CONFIDENCE_STYLES = {
    "h": ("#df2626dc", "high"),      # aabbggrr for #dc2626, alpha df
    "n": ("#df1673f9", "nominal"),   # aabbggrr for #f97316, alpha df
    "l": ("#df08abea", "low"),       # aabbggrr for #eab308, alpha df
}
DEFAULT_STYLE_ID = "low"

CONFIDENCE_LABELS = {
    "h": "High",
    "n": "Nominal",
    "l": "Low",
}

# Order matters for readability in the popup; unknown keys are appended
# after these in whatever order they appear.
PREFERRED_FIELD_ORDER = [
    "acq_date", "acq_time", "confidence", "frp", "satellite",
    "instrument", "daynight", "bright_ti4", "bright_ti5",
    "scan", "track", "version",
]

FIELD_LABELS = {
    "acq_date": "Acquisition Date",
    "acq_time": "Acquisition Time (UTC)",
    "confidence": "Confidence",
    "frp": "Fire Radiative Power (MW)",
    "satellite": "Satellite",
    "instrument": "Instrument",
    "daynight": "Day/Night",
    "bright_ti4": "Brightness TI4 (K)",
    "bright_ti5": "Brightness TI5 (K)",
    "scan": "Scan",
    "track": "Track",
    "version": "Version",
}


def build_styles():
    parts = []
    for style_id, (kml_color, _label) in CONFIDENCE_STYLES.items():
        parts.append(f"""
    <Style id="hotspot-{CONFIDENCE_STYLES[style_id][1]}">
      <IconStyle>
        <color>{kml_color}</color>
        <scale>1.0</scale>
        <Icon>
          <href>http://maps.google.com/mapfiles/kml/shapes/firedept.png</href>
        </Icon>
      </IconStyle>
    </Style>""")
    return "".join(parts)


def format_time(acq_time):
    acq_time = str(acq_time).zfill(4)
    return f"{acq_time[:2]}:{acq_time[2:]}"


def build_placemark(feature):
    props = feature.get("properties", {})
    coords = feature["geometry"]["coordinates"]
    lon, lat = coords[0], coords[1]

    confidence_raw = str(props.get("confidence", "")).strip().lower()
    style_key = confidence_raw if confidence_raw in CONFIDENCE_STYLES else "l"
    style_ref = CONFIDENCE_STYLES[style_key][1]
    confidence_label = CONFIDENCE_LABELS.get(confidence_raw, confidence_raw or "Unknown")

    acq_date = props.get("acq_date", "")
    acq_time = props.get("acq_time", "")
    time_label = format_time(acq_time) if acq_time != "" else ""
    name = f"Hotspot {acq_date} {time_label} UTC".strip()

    # ExtendedData: preferred fields first, then anything left over.
    seen = set()
    data_rows = []
    for key in PREFERRED_FIELD_ORDER:
        if key in props:
            data_rows.append((FIELD_LABELS.get(key, key), props[key]))
            seen.add(key)
    for key, value in props.items():
        if key not in seen:
            data_rows.append((key, value))

    extended_data = "".join(
        f'\n        <Data name="{escape(str(label))}">'
        f'<value>{escape(str(value))}</value></Data>'
        for label, value in data_rows
    )

    description_rows = "".join(
        f"<tr><td><b>{escape(str(label))}</b></td><td>{escape(str(value))}</td></tr>"
        for label, value in data_rows
    )
    description = (
        f"<![CDATA[<table>{description_rows}</table>]]>"
    )

    return f"""
    <Placemark>
      <name>{escape(name)}</name>
      <styleUrl>#hotspot-{style_ref}</styleUrl>
      <description>{description}</description>
      <ExtendedData>{extended_data}
      </ExtendedData>
      <Point>
        <coordinates>{lon},{lat},0</coordinates>
      </Point>
    </Placemark>"""


def main():
    with open(INPUT, "r", encoding="utf-8") as f:
        collection = json.load(f)

    features = collection.get("features", [])
    generated_at = collection.get(
        "generated_at", datetime.now(timezone.utc).isoformat()
    )

    placemarks = "".join(build_placemark(feature) for feature in features)
    styles = build_styles()

    kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fire Hotspots</name>
    <description>NASA FIRMS VIIRS hotspots. Generated at {escape(generated_at)} UTC. {len(features)} points.</description>
    {styles}
    {placemarks}
  </Document>
</kml>"""

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(kml)

    print(f"Wrote {len(features)} placemarks to {OUTPUT}")


if __name__ == "__main__":
    main()
