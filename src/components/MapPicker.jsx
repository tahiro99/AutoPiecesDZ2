/**
 * MapPicker — Sélecteur de position avec OpenStreetMap via WebView
 * Aucune clé API requise !
 *
 * INSTALLATION REQUISE :
 *   npx expo install expo-web-view
 *   (ou: npx expo install react-native-webview)
 *
 * Usage:
 *   <MapPicker
 *     lat={lat} lng={lng}
 *     onPick={({lat, lng, name}) => ...}
 *   />
 */
import React, { useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

const MAP_HTML = (lat, lng) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100vh; }
  .leaflet-control-attribution { font-size: 8px; }
  #info {
    position: absolute;
    bottom: 10px; left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: #F0A500;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 12px;
    font-family: sans-serif;
    z-index: 999;
    white-space: nowrap;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="info">Appuyez sur la carte pour choisir la position</div>
<script>
  var map = L.map('map').setView([${lat}, ${lng}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
  var info = document.getElementById('info');

  function updatePos(lat, lng) {
    info.textContent = lat.toFixed(5) + ', ' + lng.toFixed(5);
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
  }

  marker.on('dragend', function(e) {
    var pos = e.target.getLatLng();
    updatePos(pos.lat, pos.lng);
  });

  map.on('click', function(e) {
    marker.setLatLng(e.latlng);
    updatePos(e.latlng.lat, e.latlng.lng);
  });

  updatePos(${lat}, ${lng});
</script>
</body>
</html>
`;

export default function MapPicker({ lat = 36.7538, lng = 3.0588, onPick, height = 260 }) {
  const [loading, setLoading] = useState(true);
  const [pos, setPos]         = useState({ lat, lng });

  const handleMsg = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      setPos(data);
      onPick && onPick(data);
    } catch (_) {}
  };

  return (
    <View style={[mp.wrap, { height }]}>
      {loading && (
        <View style={mp.loader}>
          <ActivityIndicator color={C.accent} />
          <Text style={mp.loaderTxt}>Chargement de la carte...</Text>
        </View>
      )}
      <WebView
        source={{ html: MAP_HTML(pos.lat, pos.lng) }}
        onMessage={handleMsg}
        onLoadEnd={() => setLoading(false)}
        style={mp.map}
        javaScriptEnabled
        scrollEnabled={false}
      />
      <View style={mp.badge}>
        <Ionicons name="location" size={12} color={C.accent} />
        <Text style={mp.badgeTxt}>
          {pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}
        </Text>
      </View>
    </View>
  );
}

// ── Vue carte statique (lecture seule) ─────────────────────────────────────
export function MapView({ lat, lng, title, height = 220 }) {
  const [loading, setLoading] = useState(true);

  const html = `
  <!DOCTYPE html><html><head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>* {margin:0;padding:0;} html,body,#map{width:100%;height:100vh;} .leaflet-control-attribution{font-size:8px;}</style>
  </head><body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, dragging: true }).setView([${lat}, ${lng}], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    var icon = L.divIcon({
      html: '<div style="background:#F0A500;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize: [14,14], iconAnchor: [7,7]
    });
    L.marker([${lat}, ${lng}], { icon }).addTo(map)
      .bindPopup('${(title || "").replace(/'/g, "\\'")}').openPopup();
  </script>
  </body></html>`;

  return (
    <View style={[mp.wrap, { height }]}>
      {loading && (
        <View style={mp.loader}>
          <ActivityIndicator color={C.accent} />
          <Text style={mp.loaderTxt}>Chargement...</Text>
        </View>
      )}
      <WebView
        source={{ html }}
        onLoadEnd={() => setLoading(false)}
        style={mp.map}
        javaScriptEnabled
        scrollEnabled={false}
      />
    </View>
  );
}

const mp = StyleSheet.create({
  wrap:      { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border, position: "relative" },
  map:       { flex: 1, backgroundColor: C.surfaceAlt },
  loader:    { position: "absolute", inset: 0, zIndex: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  loaderTxt: { fontSize: 12, color: C.textMuted },
  badge:     { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:  { fontSize: 10, color: C.accent, fontWeight: "700" },
});