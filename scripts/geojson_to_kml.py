"""Convert data/hotspots.geojson into a filtered data/hotspots.kml.

Only hotspots whose coordinates fall inside a polygon from
`data/kabupaten-kalteng.geojson` are written to the KML output.

No external Python packages are required. The point-in-polygon test is
implemented here using the standard ray-casting algorithm and supports
GeoJSON Polygon and MultiPolygon geometries, including interior holes.

Avenza Maps (the mobile app) does not accept GeoJSON as an importable
Map Feature layer -- it only accepts KML/KMZ, GPX, Shapefile (Pro), and
GeoPackage (Pro). This script produces a KML file with the filtered
hotspot points so the hotspot layer can be imported into Avenza via
"Import Layers" -> "From the Web", using the GitHub Pages URL of the
output file.

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
POLYGON_INPUT = "data/kabupaten-kalteng.geojson"
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


def point_on_segment(px, py, ax, ay, bx, by, epsilon=1e-10):
    """Return True when point P lies on segment AB."""
    cross = (px - ax) * (by - ay) - (py - ay) * (bx - ax)
    if abs(cross) > epsilon:
        return False

    return (
        min(ax, bx) - epsilon <= px <= max(ax, bx) + epsilon
        and min(ay, by) - epsilon <= py <= max(ay, by) + epsilon
    )


def point_in_ring(point, ring):
    """Point-in-polygon test for one linear ring.

    Boundary points are treated as inside.
    """
    px, py = point
    inside = False

    if len(ring) < 3:
        return False

    previous = ring[-1]
    x2, y2 = previous[0], previous[1]

    for current in ring:
        x1, y1 = current[0], current[1]

        if point_on_segment(px, py, x2, y2, x1, y1):
            return True

        # Ray casting. The boolean expression avoids division when the
        # horizontal ray does not cross this edge.
        if (y1 > py) != (y2 > py):
            x_intersection = (x2 - x1) * (py - y1) / (y2 - y1) + x1
            if px < x_intersection:
                inside = not inside

        x2, y2 = x1, y1

    return inside


def point_in_polygon(point, polygon_coordinates):
    """Test a point against one GeoJSON Polygon, including holes."""
    if not polygon_coordinates:
        return False

    # First ring is the exterior boundary.
    if not point_in_ring(point, polygon_coordinates[0]):
        return False

    # Remaining rings are holes.
    for hole in polygon_coordinates[1:]:
        if point_in_ring(point, hole):
            return False

    return True


def point_in_geometry(point, geometry):
    """Test a point against a GeoJSON Polygon or MultiPolygon."""
    if not geometry:
        return False

    geometry_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if geometry_type == "Polygon":
        return point_in_polygon(point, coordinates)

    if geometry_type == "MultiPolygon":
        return any(
            point_in_polygon(point, polygon)
            for polygon in coordinates
        )

    return False


def load_kalteng_polygons():
    """Load the Kalteng administrative polygons from GeoJSON."""
    with open(POLYGON_INPUT, "r", encoding="utf-8") as f:
        collection = json.load(f)

    polygons = []
    for feature in collection.get("features", []):
        geometry = feature.get("geometry")
        if not geometry:
            continue

        properties = feature.get("properties", {})
        name = (
            properties.get("nama")
            or properties.get("kab_kota")
            or properties.get("name")
            or "Unknown"
        )

        polygons.append({
            "name": name,
            "geometry": geometry,
        })

    return polygons


def filter_hotspots(features, polygons):
    """Keep only hotspot points that fall inside a Kalteng polygon."""
    filtered = []

    for feature in features:
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates", [])

        if geometry.get("type") != "Point" or len(coordinates) < 2:
            continue

        point = (coordinates[0], coordinates[1])

        matched_polygon = None
        for polygon in polygons:
            if point_in_geometry(point, polygon["geometry"]):
                matched_polygon = polygon
                break

        if matched_polygon:
            # Preserve all FIRMS properties and add the matched
            # administrative area to the KML popup.
            filtered_feature = dict(feature)
            filtered_properties = dict(feature.get("properties", {}))
            filtered_properties["kabupaten_kota"] = matched_polygon["name"]
            filtered_feature["properties"] = filtered_properties
            filtered.append(filtered_feature)

    return filtered


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

    polygons = load_kalteng_polygons()
    filtered_features = filter_hotspots(features, polygons)

    placemarks = "".join(build_placemark(feature) for feature in filtered_features)
    styles = build_styles()

    kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Fire Hotspots - Kalimantan Tengah</name>
    <description>NASA FIRMS VIIRS hotspots filtered to Kabupaten/Kota Kalimantan Tengah. Generated at {escape(generated_at)} UTC. {len(filtered_features)} of {len(features)} points retained.</description>
    {styles}
    {placemarks}
  </Document>
</kml>"""

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(kml)

    print(f"Loaded {len(features)} FIRMS hotspots")
    print(f"Loaded {len(polygons)} Kalteng polygons")
    print(f"Filtered to {len(filtered_features)} hotspots inside Kalteng")
    print(f"Wrote {len(filtered_features)} placemarks to {OUTPUT}")


if __name__ == "__main__":
    main()
