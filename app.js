// Air Mile Radius Pro

const METERS_PER_MILE = 1609.344;

let map;
let centerMarker = null;
let radiusCircle = null;
let userLocation = null;
let deferredPrompt = null;

const centerCoords = document.getElementById("centerCoords");
const radiusDisplay = document.getElementById("radiusDisplay");
const distanceDisplay = document.getElementById("distanceDisplay");
const radiusSelect = document.getElementById("radiusSelect");
const customRadius = document.getElementById("customRadius");
const locateBtn = document.getElementById("locateBtn");

map = L.map("map", { zoomControl: true }).setView([39.8283, -98.5795], 4);

const roadMap = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }
);

const satelliteMap = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: "Esri"
  }
);

roadMap.addTo(map);

const truckStopsLayer = L.layerGroup();
const restAreasLayer = L.layerGroup();
const truckParkingLayer = L.layerGroup();
const walmartLayer = L.layerGroup();
const weighStationLayer = L.layerGroup();
const catScaleLayer = L.layerGroup();

L.control.layers(
  {
    "Road Map": roadMap,
    "Satellite": satelliteMap
  },
  {
    "Truck Stops": truckStopsLayer,
    "Rest Areas": restAreasLayer,
    "Truck Parking": truckParkingLayer,
    "Walmart": walmartLayer,
    "Weigh Stations": weighStationLayer,
    "CAT Scales": catScaleLayer
  }
).addTo(map);

L.Control.geocoder({ defaultMarkGeocode: false })
  .on("markgeocode", e => {
    const { lat, lng } = e.geocode.center;
    drawRadius(lat, lng);
  })
  .addTo(map);

function getRadiusMiles() {
  return radiusSelect.value === "custom"
    ? parseFloat(customRadius.value) || 150
    : parseFloat(radiusSelect.value);
}

function drawRadius(lat, lng) {
  const radiusMeters = getRadiusMiles() * METERS_PER_MILE;

  if (centerMarker) map.removeLayer(centerMarker);
  if (radiusCircle) map.removeLayer(radiusCircle);

  centerMarker = L.marker([lat, lng]).addTo(map);

  radiusCircle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: "#3ee9c5",
    fillColor: "#3ee9c5",
    fillOpacity: 0.08,
    weight: 3
  }).addTo(map);

  centerCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  radiusDisplay.textContent = `${getRadiusMiles()} Miles`;

  updateDistance(lat, lng);
}

function updateDistance(lat, lng) {
  if (!userLocation) {
    distanceDisplay.textContent = "GPS unavailable";
    return;
  }

  const miles =
    map.distance([lat, lng], [userLocation.lat, userLocation.lng]) /
    METERS_PER_MILE;

  distanceDisplay.textContent = `${miles.toFixed(1)} mi`;
}

function locateUser() {
  if (!navigator.geolocation) return;

  locateBtn.textContent = "Locating...";

  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      userLocation = { lat, lng };

      map.setView([lat, lng], 9);
      drawRadius(lat, lng);

      locateBtn.textContent = "📍 My Location";
    },
    () => {
      locateBtn.textContent = "📍 My Location";
      alert("Unable to get GPS location.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

async function overpass(query) {
  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const response = await fetch(url);
  return await response.json();
}

async function loadTruckStops() {
  truckStopsLayer.clearLayers();

  const b = map.getBounds();

  const query = `[out:json];
node["amenity"="fuel"]["hgv"="yes"]
(${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
out;`;

  const data = await overpass(query);

  data.elements.forEach(item => {
    L.marker([item.lat, item.lon])
      .bindPopup(item.tags?.name || "Truck Stop")
      .addTo(truckStopsLayer);
  });
}

async function loadRestAreas() {
  restAreasLayer.clearLayers();

  const b = map.getBounds();

  const query = `[out:json];
node["highway"="rest_area"]
(${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
out;`;

  const data = await overpass(query);

  data.elements.forEach(item => {
    L.marker([item.lat, item.lon])
      .bindPopup(item.tags?.name || "Rest Area")
      .addTo(restAreasLayer);
  });
}

async function loadTruckParking() {
  truckParkingLayer.clearLayers();

  const b = map.getBounds();

  const query = `[out:json];
node["amenity"="parking"]["hgv"="yes"]
(${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
out;`;

  const data = await overpass(query);

  data.elements.forEach(item => {
    L.marker([item.lat, item.lon])
      .bindPopup(item.tags?.name || "Truck Parking")
      .addTo(truckParkingLayer);
  });
}

async function loadWalmarts() {
  walmartLayer.clearLayers();

  const b = map.getBounds();

  const query = `[out:json];
node["brand"="Walmart"]
(${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()});
out;`;

  const data = await overpass(query);

  data.elements.forEach(item => {
    L.marker([item.lat, item.lon])
      .bindPopup(item.tags?.name || "Walmart")
      .addTo(walmartLayer);
  });
}

let lastLoad = 0;

map.on("moveend", () => {
  const now = Date.now();

  if (now - lastLoad < 5000) return;

  lastLoad = now;

  loadTruckStops().catch(console.error);
  loadRestAreas().catch(console.error);
  loadTruckParking().catch(console.error);
  loadWalmarts().catch(console.error);
});

map.on("click", e => {
  drawRadius(e.latlng.lat, e.latlng.lng);
});

radiusSelect.addEventListener("change", () => {
  customRadius.hidden = radiusSelect.value !== "custom";

  if (!centerMarker) return;

  const pos = centerMarker.getLatLng();
  drawRadius(pos.lat, pos.lng);
});

customRadius.addEventListener("input", () => {
  if (!centerMarker || radiusSelect.value !== "custom") return;

  const pos = centerMarker.getLatLng();
  drawRadius(pos.lat, pos.lng);
});

locateBtn.addEventListener("click", locateUser);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredPrompt = e;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

locateUser();

