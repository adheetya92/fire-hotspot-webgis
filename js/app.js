const {Map, View} = ol;
const {Tile: TileLayer, Vector: VectorLayer} = ol.layer;
const {OSM, Vector: VectorSource} = ol.source;
const {Stroke, Fill, Style} = ol.style;
const {fromLonLat} = ol.proj;
const {Point} = ol.geom;
const {Feature} = ol;
const {Circle: CircleStyle, Fill, Stroke, Style} = ol.style;

const map = new Map({
  target: "map",
  layers: [
    new TileLayer({ source: new OSM() })
  ],
  view: new View({
    center: fromLonLat([117.0, -2.0]),
    zoom: 5
  })
});

const source = new VectorSource();
const hotspotLayer = new VectorLayer({
  source,
  style: feature => {
    const c = String(feature.get("confidence") ?? "").toLowerCase();
    let color = "#eab308";
    if (c === "high") color = "#dc2626";
    else if (c === "nominal") color = "#f97316";

    return new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({color}),
        stroke: new Stroke({color: "#ffffff", width: 1})
      })
    });
  }
});
map.addLayer(hotspotLayer);
// ===============================
// LAYER BATAS PROVINSI
// ===============================


const provinsiSource = new VectorSource();


const provinsiLayer = new VectorLayer({

  source: provinsiSource,

  style: new Style({

    fill: new Fill({

      color: "rgba(0,0,0,0)"

    }),

    stroke: new Stroke({

      color: "#2563eb",

      width: 1.5

    })

  })

});


map.addLayer(provinsiLayer);



async function loadProvinsi(){

  try{


    const response = await fetch(
      "data/provinsi.geojson"
    );


    const geojson = await response.json();


    const format = new ol.format.GeoJSON();


    const features = format.readFeatures(
      geojson,
      {
        featureProjection:"EPSG:3857"
      }
    );


    provinsiSource.addFeatures(features);


  }

  catch(error){

    console.error(
      "Gagal load provinsi",
      error
    );

  }

}


loadProvinsi();

let allFeatures = [];

function normalizeConfidence(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "h" || v === "high") return "high";
  if (v === "n" || v === "nominal") return "nominal";
  if (v === "l" || v === "low") return "low";
  const n = Number(v);
  if (!Number.isNaN(n)) {
    if (n >= 80) return "high";
    if (n >= 50) return "nominal";
    return "low";
  }
  return v || "unknown";
}

function applyFilters() {
  const confidence = document.getElementById("confidence").value;
  const satellite = document.getElementById("satellite").value;

  const filtered = allFeatures.filter(f => {
    const c = normalizeConfidence(f.get("confidence"));
    const s = String(f.get("satellite") ?? "").toUpperCase();

    const confidenceOK = confidence === "all" || c === confidence;
    const satelliteOK =
      satellite === "all" ||
      s.includes(satellite);

    return confidenceOK && satelliteOK;
  });

  source.clear();
  source.addFeatures(filtered);

  document.getElementById("total").textContent = filtered.length;
  document.getElementById("high").textContent =
    filtered.filter(f => normalizeConfidence(f.get("confidence")) === "high").length;
  document.getElementById("nominal").textContent =
    filtered.filter(f => normalizeConfidence(f.get("confidence")) === "nominal").length;
  document.getElementById("low").textContent =
    filtered.filter(f => normalizeConfidence(f.get("confidence")) === "low").length;
}

function formatValue(v) {
  return v === undefined || v === null || v === "" ? "-" : String(v);
}

// ===============================
// POPUP HOTSPOT OPENLAYERS
// ===============================

const popupElement = document.getElementById("popup");

const popupOverlay = new ol.Overlay({
  element: popupElement,
  autoPan: {
    animation: {
      duration: 250
    }
  }
});

map.addOverlay(popupOverlay);


function showPopup(feature, coordinate) {

  const p = feature.getProperties();

  const content = document.getElementById("popupContent");


  content.innerHTML = `

    <h3>🔥 Hotspot FIRMS</h3>

    <table>

      <tr>
        <td>Tanggal</td>
        <td>${formatValue(p.acq_date)}</td>
      </tr>

      <tr>
        <td>Waktu UTC</td>
        <td>${formatValue(p.acq_time)}</td>
      </tr>

      <tr>
        <td>Satelit</td>
        <td>${formatValue(p.satellite)}</td>
      </tr>

      <tr>
        <td>Sensor</td>
        <td>${formatValue(p.instrument)}</td>
      </tr>

      <tr>
        <td>Confidence</td>
        <td>${formatValue(p.confidence)}</td>
      </tr>

      <tr>
        <td>FRP</td>
        <td>${formatValue(p.frp)} MW</td>
      </tr>

      <tr>
        <td>Latitude</td>
        <td>${formatValue(p.latitude)}</td>
      </tr>

      <tr>
        <td>Longitude</td>
        <td>${formatValue(p.longitude)}</td>
      </tr>

    </table>

  `;


  popupOverlay.setPosition(coordinate);
}



map.on("singleclick", event => {


  const feature = map.forEachFeatureAtPixel(
    event.pixel,
    function(feature){

      if(feature.get("confidence")){
        return feature;
      }

    }
  );


  if(feature){

    showPopup(
      feature,
      event.coordinate
    );


  } else {

    popupOverlay.setPosition(undefined);

  }


});


document
.getElementById("popupClose")
.addEventListener("click",()=>{

  popupOverlay.setPosition(undefined);

});

document.getElementById("confidence").addEventListener("change", applyFilters);
document.getElementById("satellite").addEventListener("change", applyFilters);
document.getElementById("reset").addEventListener("click", () => {
  document.getElementById("confidence").value = "all";
  document.getElementById("satellite").value = "all";
  applyFilters();
});

async function loadHotspots() {
  try {
    const url = `data/hotspots.geojson?ts=${Date.now()}`;
    const response = await fetch(url, {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const geojson = await response.json();
    const format = new ol.format.GeoJSON();

    allFeatures = format.readFeatures(geojson, {
      featureProjection: "EPSG:3857"
    });

    applyFilters();

    const generated = geojson.generated_at || geojson.metadata?.generated_at;
    document.getElementById("lastUpdate").textContent =
      generated ? `Update: ${generated}` : "Data berhasil dimuat";
  } catch (error) {
    console.error(error);
    document.getElementById("lastUpdate").textContent =
      "Gagal memuat data hotspot";
  }
}

loadHotspots();
