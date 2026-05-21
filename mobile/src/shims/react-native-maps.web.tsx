// Web shim for react-native-maps - renders an interactive map using Leaflet
import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const getLeafletHTML = (lat: number, lng: number, zoom: number, darkMode: boolean) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/${darkMode ? 'dark_all' : 'rastertiles/voyager'}/{z}/{x}/{y}{r}.png', {
      attribution: '',
      maxZoom: 19,
    }).addTo(map);

    // Add user location marker
    var userDot = L.circleMarker([${lat}, ${lng}], {
      radius: 8,
      fillColor: '#4285F4',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 1,
    }).addTo(map);

    // Pulse animation around user dot
    var pulse = L.circleMarker([${lat}, ${lng}], {
      radius: 20,
      fillColor: '#4285F4',
      color: 'transparent',
      fillOpacity: 0.15,
    }).addTo(map);

    // Try to get actual user location via browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          var userLat = pos.coords.latitude;
          var userLng = pos.coords.longitude;
          map.setView([userLat, userLng], ${zoom});
          userDot.setLatLng([userLat, userLng]);
          pulse.setLatLng([userLat, userLng]);
        },
        function(err) {
          console.log('Geolocation error:', err.message);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
      );

      // Watch for location changes
      navigator.geolocation.watchPosition(
        function(pos) {
          var userLat = pos.coords.latitude;
          var userLng = pos.coords.longitude;
          userDot.setLatLng([userLat, userLng]);
          pulse.setLatLng([userLat, userLng]);
        },
        function(err) {},
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  <\/script>
</body>
</html>
`;

const MapView = React.forwardRef((props: any, ref: any) => {
  const isDark = props.userInterfaceStyle === 'dark' || props.customMapStyle;
  const region = props.region || props.initialRegion || { latitude: -23.5505, longitude: -46.6333, latitudeDelta: 0.02 };
  const zoom = region.latitudeDelta ? Math.min(18, Math.max(10, Math.round(Math.log2(360 / (region.latitudeDelta || 0.02))))) : 14;

  if (Platform.OS === 'web') {
    return (
      <View ref={ref} style={[styles.container, props.style]}>
        <iframe
          srcDoc={getLeafletHTML(region.latitude, region.longitude, zoom, isDark)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'inherit',
          } as any}
          title="Map"
          allow="geolocation"
        />
        {props.children}
      </View>
    );
  }

  return (
    <View ref={ref} style={[styles.container, props.style]}>
      {props.children}
    </View>
  );
});
MapView.displayName = 'MapView';

const Marker = (_props: any) => null;
const Polyline = (_props: any) => null;
const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1d1d2e',
    overflow: 'hidden',
  },
});

export default MapView;
export { Marker, Polyline, PROVIDER_GOOGLE };
