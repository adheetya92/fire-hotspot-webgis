name: Update NASA FIRMS data

on:
  schedule:
    - cron: "17 * * * *"
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v6

      - name: Setup Python
        uses: actions/setup-python@v6
        with:
          python-version: "3.13"

      - name: Download FIRMS hotspot data
        env:
          FIRMS_MAP_KEY: ${{ secrets.FIRMS_MAP_KEY }}
        run: python scripts/fetch_firms.py

      - name: Commit updated GeoJSON
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/hotspots.geojson
          git diff --cached --quiet || git commit -m "chore: update FIRMS hotspots"
          git push
