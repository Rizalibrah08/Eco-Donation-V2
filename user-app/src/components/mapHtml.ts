import { colors } from '../ui/theme';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMarker extends LatLng {
  id: string;
  kind: 'pickup' | 'courier';
}

export interface MapHandle {
  setCenter: (pos: LatLng, zoom?: number) => void;
}

// HTML Leaflet mandiri (CDN unpkg, tile OSM HOT tanpa API key; cadangan Esri bila gagal).
// CARTO kini wajib API key, tile.openstreetmap.org memblokir WebView (tanpa Referer).
// Komunikasi: RN → peta lewat window.__apply(cmd); peta → RN lewat postMessage.
export function buildMapHtml({ center, zoom, picker, interactive }: { center: LatLng; zoom: number; picker: boolean; interactive: boolean }) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #EEF2F0; }
  .leaflet-control-attribution { font-size: 9px; }
  .pin { position: relative; width: 36px; height: 36px; }
  .pin .head { width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
    box-shadow: 0 4px 10px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; border: 3px solid #fff; box-sizing: border-box; }
  .pin .dot { width: 10px; height: 10px; border-radius: 50%; background: #fff; }
  .courier { width: 30px; height: 30px; border-radius: 50%; background: ${colors.info}; border: 4px solid #fff;
    box-shadow: 0 0 0 6px rgba(37,99,235,.25), 0 4px 10px rgba(0,0,0,.25); box-sizing: border-box; }
  #center-pin { position: absolute; left: 50%; top: 50%; z-index: 1000; transform: translate(-50%, -100%); pointer-events: none; }
  #center-shadow { position: absolute; left: 50%; top: 50%; width: 14px; height: 6px; margin-left: -7px; margin-top: -3px;
    border-radius: 50%; background: rgba(0,0,0,.25); z-index: 999; pointer-events: none; }
</style>
</head><body>
<div id="map"></div>
${picker ? `<div id="center-shadow"></div><div id="center-pin"><div class="pin"><div class="head" style="background:${colors.primary}"><div class="dot"></div></div></div></div>` : ''}
<script>
  var INTERACTIVE = ${interactive};
  var map = L.map('map', { zoomControl: false, attributionControl: true, dragging: INTERACTIVE, scrollWheelZoom: INTERACTIVE,
    touchZoom: INTERACTIVE, doubleClickZoom: INTERACTIVE, boxZoom: false, keyboard: false })
    .setView([${center.lat}, ${center.lng}], ${zoom});
  var tiles = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 19, subdomains: 'abc', attribution: '&copy; OpenStreetMap, HOT'
  }).addTo(map);
  var tileErrors = 0;
  tiles.on('tileerror', function () {
    if (++tileErrors !== 4) return;
    map.removeLayer(tiles);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: '&copy; Esri, OpenStreetMap'
    }).addTo(map);
  });

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent) window.parent.postMessage(s, '*');
  }

  function iconFor(kind) {
    if (kind === 'courier') return L.divIcon({ className: '', html: '<div class="courier"></div>', iconSize: [30, 30], iconAnchor: [15, 15] });
    return L.divIcon({ className: '', html: '<div class="pin"><div class="head" style="background:${colors.primary}"><div class="dot"></div></div></div>',
      iconSize: [36, 36], iconAnchor: [18, 36] });
  }

  var markers = {};
  window.__apply = function (cmd) {
    if (cmd.markers) {
      var seen = {};
      cmd.markers.forEach(function (m) {
        seen[m.id] = true;
        if (markers[m.id]) markers[m.id].setLatLng([m.lat, m.lng]);
        else markers[m.id] = L.marker([m.lat, m.lng], { icon: iconFor(m.kind), interactive: false }).addTo(map);
      });
      Object.keys(markers).forEach(function (id) {
        if (!seen[id]) { map.removeLayer(markers[id]); delete markers[id]; }
      });
    }
    if (cmd.center) map.setView([cmd.center.lat, cmd.center.lng], cmd.zoom || map.getZoom());
    if (cmd.fit) {
      var pts = Object.keys(markers).map(function (k) { return markers[k].getLatLng(); });
      if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 17 });
      else if (pts.length === 1) map.setView(pts[0], 16);
    }
  };

  ${picker ? `map.on('moveend', function () { var c = map.getCenter(); send({ type: 'move', lat: c.lat, lng: c.lng }); });` : ''}
  send({ type: 'ready' });
</script>
</body></html>`;
}
