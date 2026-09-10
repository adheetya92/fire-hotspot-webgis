# NASA FIRMS troubleshooting

The hotspot pipeline is intentionally fail-fast.

## Expected GitHub Actions log

You should see lines similar to:

    Downloading VIIRS_NOAA20_NRT...
    VIIRS_NOAA20_NRT: HTTP 200, ... bytes, Content-Type=...
    VIIRS_NOAA20_NRT: CSV rows=..., valid unique features=...

    Downloading VIIRS_NOAA21_NRT...
    VIIRS_NOAA21_NRT: HTTP 200, ... bytes, Content-Type=...
    VIIRS_NOAA21_NRT: CSV rows=..., valid unique features=...

    Wrote ... hotspot features to data/hotspots.geojson

If FIRMS returns an HTTP error, invalid CSV, or zero features, the workflow stops instead of overwriting the GeoJSON with an empty FeatureCollection.

## GitHub Secret

The workflow must expose the repository secret as:

    FIRMS_MAP_KEY

Do not put the NASA key directly into Python, JavaScript, HTML, or a committed workflow.

## Browser check

After deployment, open:

    data/hotspots.geojson

from the same GitHub Pages site. It should contain:

    "type":"FeatureCollection"

and:

    "features":[ ... ]

with at least one Feature when FIRMS has returned detections.

## Important

`data/kabupaten.geojson` is unrelated to NASA hotspot data. A missing kabupaten file may produce a 404 in the browser, but it does not create hotspot points. If the map has no hotspots, inspect `data/hotspots.geojson` first.
