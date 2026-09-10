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

const {
  Draw
} = ol.interaction;

const {
  getArea,
  getLength
} = ol.sphere;


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
// LAYER UPLOAD KML/KMZ
// ============================================================

const kmlUploadSource = new VectorSource();

const kmlUploadStyle = new Style({

  fill: new Fill({
    color: "rgba(37, 99, 235, 0.15)"
  }),

  stroke: new Stroke({
    color: "#2563eb",
    width: 2
  }),

  image: new CircleStyle({

    radius: 6,

    fill: new Fill({
      color: "#2563eb"
    }),

    stroke: new Stroke({
      color: "#ffffff",
      width: 1.5
    })

  })

});

const kmlUploadLayer = new VectorLayer({

  source: kmlUploadSource,

  // Layer upload paling atas
  zIndex: 200,

  style: function (feature) {

    // Pakai style bawaan file KML jika ada,
    // kalau tidak pakai style default biru di atas.
    const styleFunction =
      feature.getStyleFunction();

    if (styleFunction) {

      const featureStyle =
        styleFunction(feature);

      if (
        featureStyle &&
        (
          Array.isArray(featureStyle)
            ? featureStyle.length > 0
            : true
        )
      ) {

        return featureStyle;

      }

    }

    return kmlUploadStyle;

  }

});


// ============================================================
// LAYER UKUR JARAK & LUAS
// ============================================================

const measureSource = new VectorSource();

const measureLayer = new VectorLayer({

  source: measureSource,

  // Paling atas, di atas layer upload
  zIndex: 300,

  style: new Style({

    fill: new Fill({
      color: "rgba(249, 115, 22, 0.15)"
    }),

    stroke: new Stroke({
      color: "#f97316",
      width: 2,
      lineDash: [8, 8]
    }),

    image: new CircleStyle({

      radius: 5,

      fill: new Fill({
        color: "#f97316"
      }),

      stroke: new Stroke({
        color: "#ffffff",
        width: 1.5
      })

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

    // TNS Boundary
    tnsLayer,

    // Hotspot
    hotspotLayer,

    // Upload KML/KMZ
    kmlUploadLayer,

    // Ukur jarak & luas
    measureLayer

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
// UPLOAD KML / KMZ
// ============================================================

function setKMLStatus(message, type) {

  const el =
    document.getElementById(
      "kmlStatus"
    );

  if (!el) {
    return;
  }

  el.textContent = message;

  el.classList.remove(
    "success",
    "error"
  );

  if (type) {
    el.classList.add(type);
  }

}


function readFileAsText(file) {

  return new Promise(
    function (resolve, reject) {

      const reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(reader.error);
      };

      reader.readAsText(file);

    }
  );

}


function readFileAsArrayBuffer(file) {

  return new Promise(
    function (resolve, reject) {

      const reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = function () {
        reject(reader.error);
      };

      reader.readAsArrayBuffer(file);

    }
  );

}


function addKMLFeaturesFromText(kmlText) {

  const kmlFormat =
    new ol.format.KML({
      extractStyles: true,
      showPointNames: false
    });

  const features =
    kmlFormat.readFeatures(
      kmlText,
      {
        featureProjection: "EPSG:3857"
      }
    );

  if (
    !features ||
    features.length === 0
  ) {

    throw new Error(
      "Tidak ada fitur yang ditemukan di dalam file."
    );

  }

  kmlUploadSource.addFeatures(
    features
  );

  return features.length;

}


async function handleKMLFile(file) {

  const fileName =
    (file.name || "").toLowerCase();


  setKMLStatus(
    `Memuat "${file.name}" ...`,
    null
  );


  try {

    let totalFeatures = 0;


    // --------------------------------------------------------
    // File .KML (teks XML biasa)
    // --------------------------------------------------------

    if (fileName.endsWith(".kml")) {

      const text =
        await readFileAsText(file);

      totalFeatures =
        addKMLFeaturesFromText(text);

    }


    // --------------------------------------------------------
    // File .KMZ (KML terkompresi dalam ZIP)
    // --------------------------------------------------------

    else if (fileName.endsWith(".kmz")) {

      if (
        typeof JSZip === "undefined"
      ) {

        throw new Error(
          "Library JSZip belum dimuat."
        );

      }

      const buffer =
        await readFileAsArrayBuffer(
          file
        );

      const zip =
        await JSZip.loadAsync(
          buffer
        );

      const kmlEntryName =
        Object.keys(zip.files).find(
          function (name) {

            return (
              name
                .toLowerCase()
                .endsWith(".kml")
            );

          }
        );

      if (!kmlEntryName) {

        throw new Error(
          "File .kmz tidak berisi file .kml."
        );

      }

      const text =
        await zip
          .files[kmlEntryName]
          .async("string");

      totalFeatures =
        addKMLFeaturesFromText(text);

    }


    // --------------------------------------------------------
    // Format tidak didukung
    // --------------------------------------------------------

    else {

      throw new Error(
        "Format file harus .kml atau .kmz"
      );

    }


    // --------------------------------------------------------
    // Zoom otomatis ke fitur yang baru ditambahkan
    // --------------------------------------------------------

    const extent =
      kmlUploadSource.getExtent();

    if (
      extent &&
      isFinite(extent[0])
    ) {

      map.getView().fit(
        extent,
        {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
          duration: 400
        }
      );

    }


    setKMLStatus(
      `✅ "${file.name}" berhasil dimuat (${totalFeatures} fitur).`,
      "success"
    );

  }

  catch (error) {

    console.error(
      "Gagal memuat KML/KMZ:",
      error
    );

    setKMLStatus(
      `❌ Gagal memuat "${file.name}": ${error.message}`,
      "error"
    );

  }

}


const kmlFileInput =
  document.getElementById(
    "kmlFile"
  );


if (kmlFileInput) {

  kmlFileInput.addEventListener(
    "change",
    function (event) {

      const file =
        event.target.files &&
        event.target.files[0];

      if (file) {
        handleKMLFile(file);
      }

    }
  );

}


const kmlClearButton =
  document.getElementById(
    "kmlClear"
  );


if (kmlClearButton) {

  kmlClearButton.addEventListener(
    "click",
    function () {

      kmlUploadSource.clear();

      if (kmlFileInput) {
        kmlFileInput.value = "";
      }

      setKMLStatus(
        "Belum ada file diunggah",
        null
      );

    }
  );

}


// ============================================================
// UKUR JARAK & LUAS
// ============================================================

let measureDrawInteraction = null;
let measureSketchFeature = null;
let measureTooltipElement = null;
let measureTooltipOverlay = null;
let measureActiveMode = null;


function formatLength(lineGeom) {

  const length = getLength(
    lineGeom,
    {
      projection: map.getView().getProjection()
    }
  );

  if (length > 1000) {

    return (
      (length / 1000).toFixed(2) + " km"
    );

  }

  return Math.round(length) + " m";

}


function formatArea(polygonGeom) {

  const area = getArea(
    polygonGeom,
    {
      projection: map.getView().getProjection()
    }
  );

  if (area > 1000000) {

    return (
      (area / 1000000).toFixed(2) + " km²"
    );

  }

  return Math.round(area) + " m²";

}


function createMeasureTooltip() {

  if (measureTooltipOverlay) {

    map.removeOverlay(
      measureTooltipOverlay
    );

  }

  measureTooltipElement =
    document.createElement("div");

  measureTooltipElement.className =
    "measure-tooltip";

  measureTooltipOverlay = new Overlay({

    element: measureTooltipElement,

    offset: [0, -12],

    positioning: "bottom-center",

    stopEvent: false

  });

  map.addOverlay(
    measureTooltipOverlay
  );

}


function setMeasureStatus(message) {

  const el =
    document.getElementById(
      "measureStatus"
    );

  if (el) {
    el.textContent = message;
  }

}


function setMeasureButtonsActive(mode) {

  const distanceBtn =
    document.getElementById(
      "measureDistance"
    );

  const areaBtn =
    document.getElementById(
      "measureArea"
    );

  if (distanceBtn) {

    distanceBtn.classList.toggle(
      "active",
      mode === "distance"
    );

  }

  if (areaBtn) {

    areaBtn.classList.toggle(
      "active",
      mode === "area"
    );

  }

}


function stopMeasuring() {

  if (measureDrawInteraction) {

    map.removeInteraction(
      measureDrawInteraction
    );

    measureDrawInteraction = null;

  }

  // Buang tooltip yang belum selesai digambar (belum di-drawend)
  if (
    measureTooltipOverlay &&
    measureTooltipElement &&
    !measureTooltipElement.classList.contains(
      "measure-tooltip-static"
    )
  ) {

    map.removeOverlay(
      measureTooltipOverlay
    );

    measureTooltipOverlay = null;
    measureTooltipElement = null;

  }

  measureActiveMode = null;

  setMeasureButtonsActive(null);

}


function startMeasuring(mode) {

  stopMeasuring();

  measureActiveMode = mode;

  setMeasureButtonsActive(mode);

  const geometryType =
    mode === "area" ? "Polygon" : "LineString";

  setMeasureStatus(
    mode === "area"
      ? "Klik untuk menambah titik area, klik dua kali untuk selesai."
      : "Klik untuk menambah titik garis, klik dua kali untuk selesai."
  );

  measureDrawInteraction = new Draw({
    source: measureSource,
    type: geometryType
  });

  map.addInteraction(
    measureDrawInteraction
  );

  createMeasureTooltip();

  measureDrawInteraction.on(
    "drawstart",
    function (event) {

      measureSketchFeature = event.feature;

      measureSketchFeature
        .getGeometry()
        .on("change", function (changeEvent) {

          const geom = changeEvent.target;

          let output = "";
          let tooltipCoord;

          if (geom.getType() === "Polygon") {

            output = formatArea(geom);
            tooltipCoord = geom.getInteriorPoint().getCoordinates();

          }

          else {

            output = formatLength(geom);
            tooltipCoord = geom.getLastCoordinate();

          }

          measureTooltipElement.textContent = output;

          measureTooltipOverlay.setPosition(
            tooltipCoord
          );

        });

    }
  );

  measureDrawInteraction.on(
    "drawend",
    function () {

      measureTooltipElement.className =
        "measure-tooltip measure-tooltip-static";

      measureTooltipOverlay.setOffset([0, -7]);

      // Lepas referensi tooltip yang sudah selesai supaya TIDAK
      // ikut terhapus saat tooltip baru dibuat untuk sketsa berikutnya
      measureTooltipElement = null;
      measureTooltipOverlay = null;

      measureSketchFeature = null;

      setMeasureStatus(
        "Pengukuran selesai. Pilih mode lagi untuk ukur baru, atau hapus."
      );

      createMeasureTooltip();

    }
  );

}


const measureDistanceButton =
  document.getElementById(
    "measureDistance"
  );

if (measureDistanceButton) {

  measureDistanceButton.addEventListener(
    "click",
    function () {

      if (measureActiveMode === "distance") {

        stopMeasuring();

        setMeasureStatus(
          "Mode ukur jarak dimatikan."
        );

      }

      else {

        startMeasuring("distance");

      }

    }
  );

}


const measureAreaButton =
  document.getElementById(
    "measureArea"
  );

if (measureAreaButton) {

  measureAreaButton.addEventListener(
    "click",
    function () {

      if (measureActiveMode === "area") {

        stopMeasuring();

        setMeasureStatus(
          "Mode ukur luas dimatikan."
        );

      }

      else {

        startMeasuring("area");

      }

    }
  );

}


const measureClearButton =
  document.getElementById(
    "measureClear"
  );

if (measureClearButton) {

  measureClearButton.addEventListener(
    "click",
    function () {

      stopMeasuring();

      measureSource.clear();

      // Hapus semua tooltip overlay hasil pengukuran
      map.getOverlays()
        .getArray()
        .slice()
        .forEach(function (overlay) {

          const element = overlay.getElement();

          if (
            element &&
            element.classList &&
            element.classList.contains("measure-tooltip")
          ) {

            map.removeOverlay(overlay);

          }

        });

      setMeasureStatus(
        "Pilih mode ukur, lalu klik di peta. Klik dua kali / klik terakhir untuk mengakhiri."
      );

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
