# 🔥 Fire Hotspot WebGIS

WebGIS hotspot kebakaran berbasis NASA FIRMS, OpenLayers, GeoJSON, GitHub Actions, dan GitHub Pages.

## Arsitektur

NASA FIRMS → GitHub Actions → GeoJSON → GitHub Pages → OpenLayers

## Setup

1. Buat repository GitHub.
2. Upload seluruh isi project.
3. Daftarkan NASA FIRMS MAP_KEY.
4. Repository Settings → Secrets and variables → Actions → New repository secret.
5. Nama secret: `FIRMS_MAP_KEY`
6. Isi dengan MAP_KEY NASA FIRMS.
7. Pastikan Pages menggunakan GitHub Actions.
8. Jalankan workflow `Update NASA FIRMS data` secara manual sekali.
9. Workflow `Deploy WebGIS to GitHub Pages` akan mempublikasikan situs.

## Catatan

## Tes wildan

Data default `data/hotspots.geojson` hanyalah data contoh. Setelah workflow berjalan, file tersebut akan diganti oleh data FIRMS terbaru.

## Pengembangan berikutnya

- batas provinsi/kabupaten/kecamatan/desa
- filter tanggal
- heatmap
- dashboard statistik
- grafik tren
- pencarian lokasi
- spatial join
- arsip historis
