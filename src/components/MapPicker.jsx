
import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

const GOOGLE_MAPS_JS_KEY = "AIzaSyCjh6p3cLO98CVQKDnRMo8v93bMF7MCqak";

const DEFAULT = { lat: 36.7538, lng: 3.0588 }; // Alger

function mapHtml({ lat, lng, interactive }) {
  const INT = interactive ? "true" : "false";
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#12141A}</style>
</head><body>
<div id="map"></div>
<script>
  var LAT=${lat}, LNG=${lng}, INTERACTIVE=${INT}, DONE=false;
  function post(lat,lng){ if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({lat:lat,lng:lng})); }

  // ---- Google Maps ----
  function initGoogle(){
    if(DONE) return; DONE=true;
    try {
      var center={lat:LAT,lng:LNG};
      var map=new google.maps.Map(document.getElementById('map'),{
        center:center, zoom:INTERACTIVE?14:15,
        disableDefaultUI:!INTERACTIVE, zoomControl:true, mapTypeControl:false,
        streetViewControl:false, fullscreenControl:false, gestureHandling:'greedy'
      });
      var marker=new google.maps.Marker({position:center, map:map, draggable:INTERACTIVE});
      if(INTERACTIVE){
        marker.addListener('dragend', function(e){ post(e.latLng.lat(), e.latLng.lng()); });
        map.addListener('click', function(e){ marker.setPosition(e.latLng); post(e.latLng.lat(), e.latLng.lng()); });
      }
    } catch(e){ DONE=false; loadOSM(); }
  }
  // Called by Google when the API key is rejected → fall back
  window.gm_authFailure = function(){ DONE=false; loadOSM(); };

  // ---- OpenStreetMap fallback ----
  function loadOSM(){
    if(DONE) return; DONE=true;
    var s=document.createElement('script');
    s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload=function(){
      var map=L.map('map',{zoomControl:true}).setView([LAT,LNG],14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
      var icon=L.divIcon({html:'<div style="background:#F0A500;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>',iconSize:[16,16],iconAnchor:[8,8]});
      var marker=L.marker([LAT,LNG],{icon:icon, draggable:INTERACTIVE}).addTo(map);
      if(INTERACTIVE){
        marker.on('dragend', function(e){ var p=e.target.getLatLng(); post(p.lat,p.lng); });
        map.on('click', function(e){ marker.setLatLng(e.latlng); post(e.latlng.lat,e.latlng.lng); });
      }
    };
    document.head.appendChild(s);
  }

  // Safety net: if Google hasn't initialised in 4s, use OSM
  setTimeout(function(){ if(!DONE) loadOSM(); }, 4000);
</script>
<script async src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_JS_KEY}&callback=initGoogle" onerror="loadOSM()"></script>
</body></html>`;
}

export default function MapPicker({ lat = DEFAULT.lat, lng = DEFAULT.lng, onPick, height = 260 }) {
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState({ lat, lng });

  const handleMsg = (e) => {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data?.lat != null && data?.lng != null) {
        setPos(data);
        onPick && onPick(data);
      }
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
        source={{ html: mapHtml({ lat, lng, interactive: true }) }}
        onMessage={handleMsg}
        onLoadEnd={() => setLoading(false)}
        style={mp.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
      />
      <View style={mp.badge}>
        <Ionicons name="location" size={12} color={C.accent} />
        <Text style={mp.badgeTxt}>{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</Text>
      </View>
    </View>
  );
}

export function MapView({ lat, lng, title, height = 220 }) {
  const [loading, setLoading] = useState(true);
  if (lat == null || lng == null) return null;
  return (
    <View style={[mp.wrap, { height }]}>
      {loading && (
        <View style={mp.loader}>
          <ActivityIndicator color={C.accent} />
          <Text style={mp.loaderTxt}>Chargement...</Text>
        </View>
      )}
      <WebView
        source={{ html: mapHtml({ lat, lng, interactive: false }) }}
        onLoadEnd={() => setLoading(false)}
        style={mp.map}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
      />
    </View>
  );
}

const mp = StyleSheet.create({
  wrap:      { borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: C.border, position: "relative" },
  map:       { flex: 1, backgroundColor: C.surfaceAlt },
  loader:    { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", gap: 8 },
  loaderTxt: { fontSize: 12, color: C.textMuted },
  badge:     { position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:  { fontSize: 10, color: C.accent, fontWeight: "700" },
});
