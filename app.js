// Love's Air Mile Radius Pro

const METERS_PER_MILE = 1609.344;

let map;
let centerMarker = null;
let radiusCircle = null;
let userLocation = null;

const centerCoords = document.getElementById("centerCoords");
const radiusDisplay = document.getElementById("radiusDisplay");
const distanceDisplay = document.getElementById("distanceDisplay");
const radiusSelect = document.getElementById("radiusSelect");
const customRadius = document.getElementById("customRadius");
const locateBtn = document.getElementById("locateBtn");

map = L.map("map", { zoomControl: true }).setView([39.8283, -98.5795], 4);

const roadMap = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { maxZoom: 19, attribution: "&copy; OpenStreetMap" }
);

const satelliteBase = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
);

const satelliteLabels = L.tileLayer(
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
);

const satelliteMap = L.layerGroup([
  satelliteBase,
  satelliteLabels
]);

roadMap.addTo(map);

const lovesLayer = L.layerGroup().addTo(map);

L.control.layers(
  {
    "Road Map": roadMap,
    "Satellite": satelliteMap
  },
  {
    "Love's": lovesLayer
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

async function loadLoves(centerLat, centerLng, radiusMeters) {
  lovesLayer.clearLayers();

  const response = await fetch("./data/loves_locations_lite.json");
  const stores = await response.json();

  stores.forEach(store => {
    if (
      centerLat &&
      centerLng &&
      radiusMeters
    ) {
      const distance = map.distance(
        [centerLat, centerLng],
        [store.lat, store.lng]
      );

      if (distance > radiusMeters) return;
    }

    L.marker([store.lat, store.lng])
      .bindPopup(`
        <div>
          <b>${store.city}, ${store.state}</b><br>
          ${store.address || ""}<br>
          Store #${store.id || ""}
        </div>
      `)
      .addTo(lovesLayer);
  });
}

async function drawRadius(lat, lng) {
  const radiusMeters = getRadiusMiles() * METERS_PER_MILE;

  if (centerMarker) map.removeLayer(centerMarker);
  if (radiusCircle) map.removeLayer(radiusCircle);

  centerMarker = L.marker([lat, lng]).addTo(map);

  radiusCircle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: "#37F5D6",
    weight: 4,
    fillColor: "#37F5D6",
    fillOpacity: 0.05,
    dashArray: "12 10"
  }).addTo(map);

  centerCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  radiusDisplay.textContent = `${getRadiusMiles()} Miles`;

  updateDistance(lat, lng);

  await loadLoves(lat, lng, radiusMeters);
}

function locateUser() {
  navigator.geolocation.getCurrentPosition(
    async position => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      userLocation = { lat, lng };

      map.setView([lat, lng], 9);

      await drawRadius(lat, lng);

      locateBtn.textContent = "📍 My Location";
    },
    () => {
      alert("Unable to get GPS location.");
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}

locateUser();

