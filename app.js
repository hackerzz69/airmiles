// ================================
// Air Mile Radius Pro
// ================================

let map;
let centerMarker;
let radiusCircle;
let userLocation = null;

const METERS_PER_MILE = 1609.344;

const centerCoords =
    document.getElementById("centerCoords");

const radiusDisplay =
    document.getElementById("radiusDisplay");

const distanceDisplay =
    document.getElementById("distanceDisplay");

const radiusSelect =
    document.getElementById("radiusSelect");

const customRadius =
    document.getElementById("customRadius");

const locateBtn =
    document.getElementById("locateBtn");

// ================================
// Initialize Map
// ================================

map = L.map("map", {
    zoomControl: true
}).setView([39.8283, -98.5795], 4);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution:
            "&copy; OpenStreetMap Contributors"
    }
).addTo(map);

// ================================
// Geocoder Search
// ================================

L.Control.geocoder({
    defaultMarkGeocode: false
})
.on("markgeocode", function (e) {

    const latlng = e.geocode.center;

    drawRadius(
        latlng.lat,
        latlng.lng
    );

})
.addTo(map);

// ================================
// Radius Helpers
// ================================

function getSelectedRadiusMiles() {

    if (radiusSelect.value === "custom") {

        return (
            parseFloat(customRadius.value) || 150
        );
    }

    return parseFloat(radiusSelect.value);
}

function getSelectedRadiusMeters() {

    return (
        getSelectedRadiusMiles() *
        METERS_PER_MILE
    );
}

// ================================
// Draw Radius
// ================================

function drawRadius(lat, lng) {

    const radiusMeters =
        getSelectedRadiusMeters();

    if (centerMarker) {
        map.removeLayer(centerMarker);
    }

    if (radiusCircle) {
        map.removeLayer(radiusCircle);
    }

    centerMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(
            `<b>Radius Center</b><br>${lat.toFixed(6)}, ${lng.toFixed(6)}`
        );

    radiusCircle = L.circle(
        [lat, lng],
        {
            radius: radiusMeters,
            color: "#dc2626",
            weight: 3,
            fillColor: "#dc2626",
            fillOpacity: 0.15
        }
    ).addTo(map);

    centerCoords.textContent =
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    radiusDisplay.textContent =
        `${getSelectedRadiusMiles()} Miles`;

    map.fitBounds(
        radiusCircle.getBounds(),
        {
            padding: [25, 25]
        }
    );

    updateDistance(lat, lng);
}

// ================================
// Distance Calculation
// ================================

function updateDistance(
    centerLat,
    centerLng
) {

    if (!userLocation) {
        distanceDisplay.textContent =
            "GPS unavailable";
        return;
    }

    const distanceMeters =
        map.distance(
            [centerLat, centerLng],
            [
                userLocation.lat,
                userLocation.lng
            ]
        );

    const miles =
        distanceMeters /
        METERS_PER_MILE;

    distanceDisplay.textContent =
        `${miles.toFixed(1)} mi`;
}

// ================================
// Current Location
// ================================

function locateUser() {

    if (!navigator.geolocation) {

        alert(
            "Geolocation not supported."
        );

        return;
    }

    locateBtn.textContent =
        "Locating...";

    navigator.geolocation.getCurrentPosition(
        function (position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            userLocation = {
                lat,
                lng
            };

            map.setView(
                [lat, lng],
                9
            );

            drawRadius(
                lat,
                lng
            );

            locateBtn.textContent =
                "📍 My Location";
        },

        function () {

            locateBtn.textContent =
                "📍 My Location";

            alert(
                "Unable to get GPS location."
            );
        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// ================================
// Radius Selection
// ================================

radiusSelect.addEventListener(
    "change",
    () => {

        if (
            radiusSelect.value ===
            "custom"
        ) {

            customRadius.hidden =
                false;

        } else {

            customRadius.hidden =
                true;
        }

        if (centerMarker) {

            const pos =
                centerMarker.getLatLng();

            drawRadius(
                pos.lat,
                pos.lng
            );
        }
    }
);

customRadius.addEventListener(
    "input",
    () => {

        if (
            centerMarker &&
            radiusSelect.value ===
                "custom"
        ) {

            const pos =
                centerMarker.getLatLng();

            drawRadius(
                pos.lat,
                pos.lng
            );
        }
    }
);

// ================================
// Map Click
// ================================

map.on(
    "click",
    function (e) {

        drawRadius(
            e.latlng.lat,
            e.latlng.lng
        );
    }
);

// ================================
// Location Button
// ================================

locateBtn.addEventListener(
    "click",
    locateUser
);

// ================================
// PWA Install Prompt
// ================================

let deferredPrompt;

window.addEventListener(
    "beforeinstallprompt",
    (e) => {

        e.preventDefault();

        deferredPrompt = e;

        const installBtn =
            document.createElement(
                "button"
            );

        installBtn.className =
            "install-btn";

        installBtn.textContent =
            "⬇ Install App";

        document.body.appendChild(
            installBtn
        );

        installBtn.addEventListener(
            "click",
            async () => {

                installBtn.remove();

                deferredPrompt.prompt();

                await deferredPrompt.userChoice;

                deferredPrompt = null;
            }
        );
    }
);

// ================================
// Service Worker
// ================================

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .catch(console.error);
        }
    );
}

// ================================
// Auto Start
// ================================

locateUser();
