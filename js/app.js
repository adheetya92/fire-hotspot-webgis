// ============================================================
// FIRE HOTSPOT WEBGIS
// OpenLayers + NASA FIRMS + TNS Boundary + GPS
// ============================================================


// ============================================================
// IMPORT OPENLAYERS
// ============================================================

const { Map, View, Feature } = ol;

const {
  Tile: TileLayer,
  Vector: VectorLayer
} = ol.layer;

const {
  OSM,
  Vector: VectorSource
} = ol.source;

const {
  fromLonLat
} = ol.proj;

const {
  Circle: CircleStyle,
  Fill,
  Stroke,
  Style
} = ol.style;

const {
  Point
} = ol.geom;

const {
  Overlay
} = ol;


// ============================================================
// BASEMAP
// ============================================================

const baseLayer = new TileLayer({
  source: new OSM()
});


// ============================================================
// VECTOR SOURCE HOTSPOT
// ============================================================

const hotspotSource = new VectorSource();


// ============================================================
// STYLE HOTSPOT
// ============================================================

const hotspotLayer = new VectorLayer({

  source: hotspotSource,

  // Hotspot di atas TNS
  zIndex: 100,

  style: function (feature) {

    const confidence =
      String(feature.get("confidence") ?? "")
        .trim()
        .toLowerCase();

    let color = "#eab308";

    if (confidence === "high") {
      color = "#dc2626";
    }

    else if (confidence === "nominal") {
      color = "#f97316";
    }

    else if (confidence === "low") {
      color = "#eab308";
    }

    return new Style({

      image: new CircleStyle({

        radius: 5,

        fill: new Fill({
          color: color
        }),

        stroke: new Stroke({
          color: "#ffffff",
          width: 1
        })

      })

    });

  }

});


// ============================================================
// LAYER TNS BOUNDARY
// ============================================================

const tnsSource = new VectorSource();

const tnsLayer = new VectorLayer({

  source: tnsSource,

  // TNS di bawah hotspot
  zIndex: 10,

  style: new Style({

    fill: new Fill({
      color: "rgba(34, 197, 94, 0.12)"
    }),

    stroke: new Stroke({
      color: "#16a34a",
      width: 2
    })

  })

});


// ============================================================
// LAYER BATAS ADMINISTRASI (Kabupaten/Kota & Kecamatan)
// ============================================================
//
// Sengaja tanpa "fill" (transparan) supaya hotspot yang ada di
// dalamnya tetap terlihat jelas, cuma garis batasnya saja yang
// ditampilkan.

const kabupatenSource = new VectorSource();

const kabupatenLayer = new VectorLayer({

  source: kabupatenSource,

  zIndex: 5,

  visible: false,

  style: new Style({

    stroke: new Stroke({
      color: "#1f2937",
      width: 2
    })

  })

});


const kecamatanSource = new VectorSource();

const kecamatanLayer = new VectorLayer({

  source: kecamatanSource,

  zIndex: 6,

  visible: false,

  style: new Style({

    stroke: new Stroke({
      color: "#64748b",
      width: 1,
      lineDash: [
        4,
        4
      ]
    })

  })

});


// ============================================================
// MAP
// ============================================================

const map = new Map({

  target: "map",

  layers: [

    baseLayer,

    // Batas administrasi (di bawah TNS)
    kabupatenLayer,
    kecamatanLayer,

    // TNS Boundary
    tnsLayer,

    // Hotspot
    hotspotLayer

  ],

  view: new View({

    center: fromLonLat([
      117.0,
      -2.0
    ]),

    zoom: 5

  })

});


// ============================================================
// POPUP ELEMENT
// ============================================================

// Pastikan elemen popup tersedia.
// Kalau belum ada di HTML, dibuat otomatis.

let popup = document.getElementById("popup");

if (!popup) {

  popup = document.createElement("div");

  popup.id = "popup";

  popup.hidden = true;

  popup.innerHTML = `
    <button
      id="popupClose"
      type="button"
      aria-label="Tutup popup"
    >
      ×
    </button>

    <div id="popupContent"></div>
  `;

  document.body.appendChild(popup);

}


// ============================================================
// POPUP CONTENT
// ============================================================

let popupContent =
  document.getElementById("popupContent");

if (!popupContent) {

  popupContent =
    document.createElement("div");

  popupContent.id = "popupContent";

  popup.appendChild(popupContent);

}


// ============================================================
// OVERLAY POPUP
// ============================================================

const popupOverlay = new Overlay({

  element: popup,

  autoPan: false,

  stopEvent: true,

  offset: [
    0,
    -12
  ],

  positioning: "bottom-center"

});

map.addOverlay(popupOverlay);


// ============================================================
// CLOSE POPUP
// ============================================================

const popupClose =
  document.getElementById("popupClose");

if (popupClose) {

  popupClose.addEventListener(
    "click",
    function (event) {

      event.preventDefault();

      event.stopPropagation();

      popupOverlay.setPosition(undefined);

      popup.hidden = true;

    }
  );

}


// ============================================================
// NORMALIZE CONFIDENCE
// ============================================================

function normalizeConfidence(value) {

  const v =
    String(value ?? "")
      .trim()
      .toLowerCase();

  if (
    v === "h" ||
    v === "high"
  ) {

    return "high";

  }

  if (
    v === "n" ||
    v === "nominal"
  ) {

    return "nominal";

  }

  if (
    v === "l" ||
    v === "low"
  ) {

    return "low";

  }

  const n = Number(v);

  if (!Number.isNaN(n)) {

    if (n >= 80) {
      return "high";
    }

    if (n >= 50) {
      return "nominal";
    }

    return "low";

  }

  return v || "unknown";

}


// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {

    return "-";

  }

  return String(value);

}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================================
// SHOW HOTSPOT POPUP
// ============================================================

function showHotspotPopup(
  feature,
  coordinate
) {

  const p =
    feature.getProperties();

  const confidence =
    normalizeConfidence(
      p.confidence
    );

  let confidenceText =
    formatValue(p.confidence);

  if (
    confidenceText !== "-"
  ) {

    confidenceText =
      confidenceText
        .toString()
        .toUpperCase();

  }


  popupContent.innerHTML = `

    <div class="popup-title">
      🔥 Hotspot
    </div>

    <table class="popup-table">

      <tr>
        <td>Tanggal</td>
        <td>
          ${escapeHTML(
            formatValue(p.acq_date)
          )}
        </td>
      </tr>

      <tr>
        <td>Waktu UTC</td>
        <td>
          ${escapeHTML(
            formatValue(p.acq_time)
          )}
        </td>
      </tr>

      <tr>
        <td>Satelit</td>
        <td>
          ${escapeHTML(
            formatValue(p.satellite)
          )}
        </td>
      </tr>

      <tr>
        <td>Instrument</td>
        <td>
          ${escapeHTML(
            formatValue(p.instrument)
          )}
        </td>
      </tr>

      <tr>
        <td>Confidence</td>
        <td>
          <strong class="confidence-${confidence}">
            ${escapeHTML(
              confidenceText
            )}
          </strong>
        </td>
      </tr>

      <tr>
        <td>FRP</td>
        <td>
          ${escapeHTML(
            formatValue(p.frp)
          )} MW
        </td>
      </tr>

      <tr>
        <td>Latitude</td>
        <td>
          ${escapeHTML(
            formatValue(p.latitude)
          )}
        </td>
      </tr>

      <tr>
        <td>Longitude</td>
        <td>
          ${escapeHTML(
            formatValue(p.longitude)
          )}
        </td>
      </tr>

    </table>

  `;


  popup.hidden = false;

  popupOverlay.setPosition(
    coordinate
  );

}


// ============================================================
// CLOSE POPUP WHEN MOVING MAP
// ============================================================

map.on(
  "movestart",
  function () {

    popupOverlay.setPosition(
      undefined
    );

    popup.hidden = true;

  }
);


// ============================================================
// CLICK HOTSPOT
// ============================================================

map.on(
  "singleclick",
  function (event) {

    let hotspotFound = false;

    map.forEachFeatureAtPixel(

      event.pixel,

      function (
        feature,
        layer
      ) {

        // Hanya hotspot yang dapat diklik
        if (
          layer !== hotspotLayer
        ) {

          return false;

        }

        hotspotFound = true;

        showHotspotPopup(
          feature,
          event.coordinate
        );

        return true;

      },

      {

        hitTolerance: 8,

        layerFilter:
          function (layer) {

            return (
              layer === hotspotLayer
            );

          }

      }

    );


    if (!hotspotFound) {

      popupOverlay.setPosition(
        undefined
      );

      popup.hidden = true;

    }

  }
);


// ============================================================
// FILTER DATA
// ============================================================

let allFeatures = [];


function applyFilters() {

  const confidenceElement =
    document.getElementById(
      "confidence"
    );

  const satelliteElement =
    document.getElementById(
      "satellite"
    );


  const confidence =
    confidenceElement
      ? confidenceElement.value
      : "all";


  const satellite =
    satelliteElement
      ? satelliteElement.value
      : "all";


  const filtered =
    allFeatures.filter(
      function (feature) {

        const c =
          normalizeConfidence(
            feature.get(
              "confidence"
            )
          );


        const s =
          String(
            feature.get(
              "satellite"
            ) ?? ""
          )
          .toUpperCase();


        const confidenceOK =
          confidence === "all" ||
          c === confidence;


        const satelliteOK =
          satellite === "all" ||
          s.includes(
            satellite.toUpperCase()
          );


        return (
          confidenceOK &&
          satelliteOK
        );

      }
    );


  hotspotSource.clear();

  hotspotSource.addFeatures(
    filtered
  );


  updateStatistics(
    filtered
  );

}


// ============================================================
// UPDATE STATISTICS
// ============================================================

function updateStatistics(
  features
) {

  const total =
    document.getElementById(
      "total"
    );

  const high =
    document.getElementById(
      "high"
    );

  const nominal =
    document.getElementById(
      "nominal"
    );

  const low =
    document.getElementById(
      "low"
    );


  if (total) {

    total.textContent =
      features.length;

  }


  if (high) {

    high.textContent =
      features.filter(
        function (feature) {

          return (
            normalizeConfidence(
              feature.get(
                "confidence"
              )
            ) === "high"
          );

        }
      ).length;

  }


  if (nominal) {

    nominal.textContent =
      features.filter(
        function (feature) {

          return (
            normalizeConfidence(
              feature.get(
                "confidence"
              )
            ) === "nominal"
          );

        }
      ).length;

  }


  if (low) {

    low.textContent =
      features.filter(
        function (feature) {

          return (
            normalizeConfidence(
              feature.get(
                "confidence"
              )
            ) === "low"
          );

        }
      ).length;

  }

}


// ============================================================
// LOAD HOTSPOTS
// ============================================================

async function loadHotspots() {

  const lastUpdate =
    document.getElementById(
      "lastUpdate"
    );


  try {

    if (lastUpdate) {

      lastUpdate.textContent =
        "Memuat data...";

    }


    const url =
      `data/hotspots.geojson?ts=${Date.now()}`;


    const response =
      await fetch(
        url,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const geojson =
      await response.json();


    const format =
      new ol.format.GeoJSON();


    if (
      geojson.type ===
      "FeatureCollection"
    ) {

      allFeatures =
        format.readFeatures(
          geojson,
          {
            dataProjection: "EPSG:4326",
            featureProjection:
              "EPSG:3857"
          }
        );

    }

    else if (
      geojson.type ===
      "Feature"
    ) {

      allFeatures = [

        format.readFeature(
          geojson,
          {
            dataProjection: "EPSG:4326",
            featureProjection:
              "EPSG:3857"
          }
        )

      ];

    }

    else {

      throw new Error(
        "Format GeoJSON hotspot tidak valid"
      );

    }


    applyFilters();


    const generated =
      geojson.generated_at ||
      (
        geojson.metadata &&
        geojson.metadata.generated_at
      );


    if (lastUpdate) {

      lastUpdate.textContent =
        generated
          ? `Update: ${generated}`
          : "Data berhasil dimuat";

    }


    console.log(
      "Hotspot berhasil dimuat:",
      allFeatures.length
    );


  }

  catch (error) {

    console.error(
      "Gagal memuat hotspot:",
      error
    );


    if (lastUpdate) {

      lastUpdate.textContent =
        "Gagal memuat data hotspot";

    }

  }

}


// ============================================================
// LOAD TNS BOUNDARY
// ============================================================

async function loadTNSBoundary() {

  try {

    const response =
      await fetch(
        `data/TNS-boundary.geojson?ts=${Date.now()}`,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const geojson =
      await response.json();


    const format =
      new ol.format.GeoJSON();


    let features = [];


    // --------------------------------------------------------
    // FeatureCollection
    // --------------------------------------------------------

    if (
      geojson.type ===
      "FeatureCollection"
    ) {

      features =
        format.readFeatures(
          geojson,
          {
            dataProjection:
              "EPSG:4326",

            featureProjection:
              "EPSG:3857"
          }
        );

    }


    // --------------------------------------------------------
    // Feature tunggal
    // --------------------------------------------------------

    else if (
      geojson.type ===
      "Feature"
    ) {

      features = [

        format.readFeature(
          geojson,
          {
            dataProjection:
              "EPSG:4326",

            featureProjection:
              "EPSG:3857"
          }
        )

      ];

    }


    else {

      throw new Error(
        "Format GeoJSON TNS tidak valid"
      );

    }


    // --------------------------------------------------------
    // Masukkan ke source TNS
    // --------------------------------------------------------

    tnsSource.clear();

    tnsSource.addFeatures(
      features
    );


    console.log(
      "TNS Boundary berhasil dimuat:",
      features.length
    );


    // --------------------------------------------------------
    // Zoom otomatis ke TNS
    // --------------------------------------------------------

    if (
      features.length > 0
    ) {

      map.getView().fit(
        tnsSource.getExtent(),
        {

          padding: [
            50,
            50,
            50,
            50
          ],

          duration: 1000,

          maxZoom: 13

        }
      );

    }

  }

  catch (error) {

    console.error(
      "Gagal memuat TNS Boundary:",
      error
    );

  }

}


// ============================================================
// LOAD BATAS ADMINISTRASI (generik, dipakai kabupaten & kecamatan)
// ============================================================

async function loadAdminBoundaryLayer(url, source, label) {

  const response =
    await fetch(
      `${url}?ts=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const geojson = await response.json();

  const format = new ol.format.GeoJSON();

  let features = [];

  if (geojson.type === "FeatureCollection") {

    features = format.readFeatures(
      geojson,
      {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857"
      }
    );

  }

  else if (geojson.type === "Feature") {

    features = [
      format.readFeature(
        geojson,
        {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857"
        }
      )
    ];

  }

  else {
    throw new Error(`Format GeoJSON ${label} tidak valid`);
  }

  source.clear();
  source.addFeatures(features);

  console.log(
    `Layer ${label} berhasil dimuat:`,
    features.length
  );

  return features.length;

}


// Supaya file cuma di-fetch sekali walau checkbox dipencet
// berkali-kali.
const adminBoundaryState = {

  kabupaten: {
    loaded: false,
    loading: false,
    url: "data/kabupaten-kalteng.geojson"
  },

  kecamatan: {
    loaded: false,
    loading: false,
    url: "data/kecamatan-kalteng.geojson"
  }

};


function setupAdminBoundaryToggle(checkboxId, layer, source, stateKey, label) {

  const checkbox = document.getElementById(checkboxId);

  if (!checkbox) {
    return;
  }

  checkbox.addEventListener("change", async function () {

    const state = adminBoundaryState[stateKey];

    // Belum dicentang -> sembunyikan saja, tidak perlu fetch ulang
    if (!checkbox.checked) {
      layer.setVisible(false);
      return;
    }

    layer.setVisible(true);

    // Sudah pernah dimuat sebelumnya -> tidak perlu fetch lagi
    if (state.loaded || state.loading) {
      return;
    }

    state.loading = true;

    try {

      const count =
        await loadAdminBoundaryLayer(
          state.url,
          source,
          label
        );

      state.loaded = true;

      if (count === 0) {

        console.warn(
          `${label}: file GeoJSON ditemukan tapi tidak berisi fitur.`
        );

      }

    }

    catch (error) {

      console.error(
        `Gagal memuat batas ${label}:`,
        error
      );

      alert(
        `Gagal memuat batas ${label}. ` +
        `Pastikan file ${state.url} sudah ada di repo.`
      );

      checkbox.checked = false;
      layer.setVisible(false);

    }

    finally {
      state.loading = false;
    }

  });

}


setupAdminBoundaryToggle(
  "toggleKabupaten",
  kabupatenLayer,
  kabupatenSource,
  "kabupaten",
  "Kabupaten/Kota"
);

setupAdminBoundaryToggle(
  "toggleKecamatan",
  kecamatanLayer,
  kecamatanSource,
  "kecamatan",
  "Kecamatan"
);


// ============================================================
// UPLOAD KML / KMZ
// ============================================================

const kmlSource = new VectorSource();

const kmlLayer = new VectorLayer({

  source: kmlSource,

  // Di atas TNS, di bawah hotspot, supaya hotspot tetap terlihat
  zIndex: 60

});

map.addLayer(kmlLayer);


const kmlUploadButton =
  document.getElementById("kmlUploadButton");

const kmlUploadInput =
  document.getElementById("kmlUpload");

const kmlStatus =
  document.getElementById("kmlStatus");


function setKMLStatus(message, type = "") {

  if (!kmlStatus) {
    return;
  }

  kmlStatus.hidden = false;

  kmlStatus.textContent = message;

  kmlStatus.className = "kml-status";

  if (type) {
    kmlStatus.classList.add(type);
  }

}


function zoomToKMLSource() {

  const extent = kmlSource.getExtent();

  const isValidExtent =
    extent &&
    extent.every(function (value) {
      return Number.isFinite(value);
    });

  if (!isValidExtent) {
    return;
  }

  map.getView().fit(extent, {

    padding: [
      50,
      50,
      50,
      50
    ],

    duration: 1000,

    maxZoom: 16

  });

}


function addKMLFeatures(kmlText, fileLabel) {

  const format = new ol.format.KML({
    extractStyles: true
  });

  let features;

  try {

    features = format.readFeatures(
      kmlText,
      {
        featureProjection: "EPSG:3857"
      }
    );

  }

  catch (error) {

    console.error("Gagal parsing KML:", error);

    setKMLStatus(
      `Gagal membaca ${fileLabel}: isi file KML tidak valid.`,
      "error"
    );

    return;

  }

  if (!features.length) {

    setKMLStatus(
      `${fileLabel} tidak berisi data yang bisa ditampilkan.`,
      "error"
    );

    return;

  }

  kmlSource.clear();

  kmlSource.addFeatures(features);

  setKMLStatus(
    `${fileLabel}: ${features.length} fitur dimuat.`,
    "success"
  );

  zoomToKMLSource();

}


function handleKMLFile(file) {

  const name = file.name || "file";

  const lower = name.toLowerCase();


  // --------------------------------------------------------
  // KML biasa (teks langsung)
  // --------------------------------------------------------

  if (lower.endsWith(".kml")) {

    const reader = new FileReader();

    reader.onload = function () {
      addKMLFeatures(reader.result, name);
    };

    reader.onerror = function () {
      setKMLStatus(`Gagal membaca ${name}.`, "error");
    };

    reader.readAsText(file);

    return;

  }


  // --------------------------------------------------------
  // KMZ (KML yang di-zip, perlu dibuka dulu pakai JSZip)
  // --------------------------------------------------------

  if (lower.endsWith(".kmz")) {

    if (typeof JSZip === "undefined") {

      setKMLStatus(
        "Library KMZ gagal dimuat. Coba refresh halaman.",
        "error"
      );

      return;

    }

    const reader = new FileReader();

    reader.onload = function () {

      JSZip.loadAsync(reader.result)
        .then(function (zip) {

          const kmlEntryName =
            Object.keys(zip.files).find(function (entryName) {
              return entryName.toLowerCase().endsWith(".kml");
            });

          if (!kmlEntryName) {

            setKMLStatus(
              `${name} tidak berisi file .kml di dalamnya.`,
              "error"
            );

            return;

          }

          return zip.files[kmlEntryName]
            .async("string")
            .then(function (text) {
              addKMLFeatures(text, name);
            });

        })
        .catch(function (error) {

          console.error("Gagal membuka KMZ:", error);

          setKMLStatus(
            `Gagal membuka ${name}: bukan file KMZ yang valid.`,
            "error"
          );

        });

    };

    reader.onerror = function () {
      setKMLStatus(`Gagal membaca ${name}.`, "error");
    };

    reader.readAsArrayBuffer(file);

    return;

  }


  // --------------------------------------------------------
  // Format lain: ditolak
  // --------------------------------------------------------

  setKMLStatus(
    "Format file tidak didukung. Gunakan .kml atau .kmz.",
    "error"
  );

}


if (kmlUploadButton && kmlUploadInput) {

  kmlUploadButton.addEventListener(
    "click",
    function () {
      kmlUploadInput.click();
    }
  );

  kmlUploadInput.addEventListener(
    "change",
    function () {

      const file =
        kmlUploadInput.files &&
        kmlUploadInput.files[0];

      if (!file) {
        return;
      }

      setKMLStatus("Memuat file...");

      handleKMLFile(file);

      // Kosongkan input supaya file yang sama bisa di-upload ulang
      kmlUploadInput.value = "";

    }
  );

}


// ============================================================
// FILTER EVENTS
// ============================================================

const confidenceSelect =
  document.getElementById(
    "confidence"
  );


if (confidenceSelect) {

  confidenceSelect.addEventListener(
    "change",
    applyFilters
  );

}


const satelliteSelect =
  document.getElementById(
    "satellite"
  );


if (satelliteSelect) {

  satelliteSelect.addEventListener(
    "change",
    applyFilters
  );

}


// ============================================================
// RESET FILTER
// ============================================================

const resetButton =
  document.getElementById(
    "reset"
  );


if (resetButton) {

  resetButton.addEventListener(
    "click",
    function () {

      if (confidenceSelect) {

        confidenceSelect.value =
          "all";

      }


      if (satelliteSelect) {

        satelliteSelect.value =
          "all";

      }


      applyFilters();

    }
  );

}


// ============================================================
// LOAD ALL DATA
// ============================================================

loadHotspots();

loadTNSBoundary();


// ============================================================
// DEBUG
// ============================================================

console.log(
  "🔥 Fire Hotspot WebGIS aktif"
);

console.log(
  "📍 Layer hotspot aktif"
);

console.log(
  "🟢 Layer TNS Boundary aktif"
);


// ============================================================
// GPS / LOKASI PENGGUNA
// ============================================================

// Source untuk GPS
const gpsSource = new VectorSource();


// Layer GPS
const gpsLayer = new VectorLayer({

  source: gpsSource,

  zIndex: 1000,

  style: function (feature) {

    const type =
      feature.get("gpsType");


    // Lingkaran akurasi
    if (
      type === "accuracy"
    ) {

      return new Style({

        fill: new Fill({
          color:
            "rgba(37, 99, 235, 0.12)"
        }),

        stroke: new Stroke({
          color:
            "rgba(37, 99, 235, 0.45)",

          width: 1
        })

      });

    }


    // Titik GPS
    return new Style({

      image: new CircleStyle({

        radius: 8,

        fill: new Fill({
          color: "#2563eb"
        }),

        stroke: new Stroke({
          color: "#ffffff",

          width: 3
        })

      })

    });

  }

});


// Tambahkan layer GPS ke map
map.addLayer(gpsLayer);


// ============================================================
// VARIABEL GPS
// ============================================================

let gpsWatchId = null;

let gpsCoordinate = null;


// ============================================================
// ELEMENT HTML
// ============================================================

const gpsButton =
  document.getElementById(
    "gpsButton"
  );


const gpsFollowButton =
  document.getElementById(
    "gpsFollowButton"
  );


const gpsStatus =
  document.getElementById(
    "gpsStatus"
  );


const gpsInfo =
  document.getElementById(
    "gpsInfo"
  );


const gpsLatitude =
  document.getElementById(
    "gpsLatitude"
  );


const gpsLongitude =
  document.getElementById(
    "gpsLongitude"
  );


const gpsAccuracy =
  document.getElementById(
    "gpsAccuracy"
  );


// ============================================================
// UPDATE STATUS
// ============================================================

function setGPSStatus(
  message,
  type = ""
) {

  if (!gpsStatus) {
    return;
  }


  gpsStatus.textContent =
    message;


  gpsStatus.className =
    "gps-status";


  if (type) {

    gpsStatus.classList.add(
      type
    );

  }

}


// ============================================================
// UPDATE GPS INFORMATION
// ============================================================

function updateGPSInfo(
  latitude,
  longitude,
  accuracy
) {

  if (gpsLatitude) {

    gpsLatitude.textContent =
      Number(latitude)
        .toFixed(6);

  }


  if (gpsLongitude) {

    gpsLongitude.textContent =
      Number(longitude)
        .toFixed(6);

  }


  if (gpsAccuracy) {

    gpsAccuracy.textContent =
      `${Math.round(accuracy)} meter`;

  }


  if (gpsInfo) {

    gpsInfo.hidden = false;

  }

}


// ============================================================
// UPDATE GPS MARKER
// ============================================================

function updateGPSMarker(
  latitude,
  longitude,
  accuracy
) {

  const coordinate =
    fromLonLat([
      longitude,
      latitude
    ]);


  gpsCoordinate =
    coordinate;


  // Hapus marker GPS lama
  gpsSource.clear();


  // ========================================================
  // LINGKARAN AKURASI
  // ========================================================

  const accuracyGeometry =
    new ol.geom.Circle(
      coordinate,
      accuracy
    );


  const accuracyFeature =
    new Feature(
      accuracyGeometry
    );


  accuracyFeature.set(
    "gpsType",
    "accuracy"
  );


  gpsSource.addFeature(
    accuracyFeature
  );


  // ========================================================
  // TITIK GPS
  // ========================================================

  const positionFeature =
    new Feature(
      new Point(
        coordinate
      )
    );


  positionFeature.set(
    "gpsType",
    "position"
  );


  gpsSource.addFeature(
    positionFeature
  );

}


// ============================================================
// GPS POSITION SUCCESS
// ============================================================

function handleGPSPosition(
  position,
  centerMap = false
) {

  const latitude =
    position.coords.latitude;


  const longitude =
    position.coords.longitude;


  const accuracy =
    position.coords.accuracy;


  updateGPSInfo(
    latitude,
    longitude,
    accuracy
  );


  updateGPSMarker(
    latitude,
    longitude,
    accuracy
  );


  setGPSStatus(
    `GPS aktif • akurasi ±${Math.round(accuracy)} meter`,
    "success"
  );


  // ========================================================
  // PUSATKAN PETA
  // ========================================================

  if (
    centerMap &&
    gpsCoordinate
  ) {

    map.getView().animate({

      center:
        gpsCoordinate,

      zoom:
        Math.max(
          map.getView().getZoom(),
          14
        ),

      duration: 1000

    });

  }

}


// ============================================================
// GPS ERROR
// ============================================================

function handleGPSError(
  error
) {

  let message =
    "Gagal mendapatkan lokasi GPS.";


  if (
    error.code ===
    error.PERMISSION_DENIED
  ) {

    message =
      "Izin lokasi ditolak. Silakan izinkan lokasi pada browser.";

  }


  else if (
    error.code ===
    error.POSITION_UNAVAILABLE
  ) {

    message =
      "Lokasi GPS tidak tersedia.";

  }


  else if (
    error.code ===
    error.TIMEOUT
  ) {

    message =
      "Waktu pencarian GPS habis. Coba lagi.";

  }


  setGPSStatus(
    message,
    "error"
  );


  console.error(
    "GPS error:",
    error
  );

}


// ============================================================
// CHECK GEOLOCATION SUPPORT
// ============================================================

function checkGPSSupport() {

  if (
    !navigator.geolocation
  ) {

    setGPSStatus(
      "Browser tidak mendukung GPS/geolocation.",
      "error"
    );


    if (gpsButton) {

      gpsButton.disabled =
        true;

    }


    if (gpsFollowButton) {

      gpsFollowButton.disabled =
        true;

    }


    return false;

  }


  return true;

}


// ============================================================
// GET LOCATION ONCE
// ============================================================

function getCurrentGPS() {

  if (
    !checkGPSSupport()
  ) {

    return;

  }


  setGPSStatus(
    "Mencari lokasi GPS..."
  );


  navigator.geolocation.getCurrentPosition(

    function (position) {

      handleGPSPosition(
        position,
        true
      );

    },


    function (error) {

      handleGPSError(
        error
      );

    },


    {

      enableHighAccuracy:
        true,

      timeout:
        15000,

      maximumAge:
        0

    }

  );

}


// ============================================================
// START GPS FOLLOW
// ============================================================

function startGPSFollow() {

  if (
    !checkGPSSupport()
  ) {

    return;

  }


  // Jika sudah aktif, jangan membuat watcher baru
  if (
    gpsWatchId !== null
  ) {

    return;

  }


  setGPSStatus(
    "Mengikuti lokasi GPS..."
  );


  gpsWatchId =
    navigator.geolocation.watchPosition(

      function (position) {

        handleGPSPosition(
          position,
          true
        );

      },


      function (error) {

        handleGPSError(
          error
        );

      },


      {

        enableHighAccuracy:
          true,

        timeout:
          15000,

        maximumAge:
          2000

      }

    );


  if (gpsFollowButton) {

    gpsFollowButton.classList.add(
      "active"
    );


    gpsFollowButton.textContent =
      "⏹ Berhenti Ikuti Lokasi";

  }

}


// ============================================================
// STOP GPS FOLLOW
// ============================================================

function stopGPSFollow() {

  if (
    gpsWatchId !== null
  ) {

    navigator.geolocation.clearWatch(
      gpsWatchId
    );


    gpsWatchId = null;

  }


  if (gpsFollowButton) {

    gpsFollowButton.classList.remove(
      "active"
    );


    gpsFollowButton.textContent =
      "🎯 Ikuti Lokasi";

  }


  setGPSStatus(
    "Pelacakan GPS dihentikan."
  );

}


// ============================================================
// BUTTON: LOKASI SAYA
// ============================================================

if (gpsButton) {

  gpsButton.addEventListener(
    "click",
    function () {

      getCurrentGPS();

    }
  );

}


// ============================================================
// BUTTON: IKUTI LOKASI
// ============================================================

if (gpsFollowButton) {

  gpsFollowButton.addEventListener(
    "click",
    function () {

      if (
        gpsWatchId === null
      ) {

        startGPSFollow();

      }

      else {

        stopGPSFollow();

      }

    }
  );

}


// ============================================================
// INITIAL GPS CHECK
// ============================================================

checkGPSSupport();
