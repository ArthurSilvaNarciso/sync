// Map para web — usa Leaflet vanilla (sem react-leaflet) para evitar
// complexidades de bundle CSS no Metro/Expo Web.
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { View } from 'react-native';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';

// CSS do Leaflet + overrides do Sync (injetado uma vez)
function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('sync-leaflet-css')) return;

  // Carrega o CSS oficial do leaflet via <link> (cacheado pelo SW se houver)
  const link = document.createElement('link');
  link.id = 'sync-leaflet-css';
  link.rel = 'stylesheet';
  link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
  link.crossOrigin = 'anonymous';
  link.integrity = 'sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = 'sync-leaflet-style';
  style.innerHTML = `
    .leaflet-container { background: #0A0A0F; outline: none; }
    .leaflet-control-attribution {
      background: rgba(10,10,15,0.6) !important;
      color: rgba(255,255,255,0.5) !important;
      font-size: 9px !important;
    }
    .leaflet-control-attribution a { color: #FF6B35 !important; }
    .sync-marker { background: transparent !important; border: 0 !important; }
  `;
  document.head.appendChild(style);
}

// Ícones default do leaflet servidos via CDN (evita asset resolution do Metro)
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images';
(L.Icon.Default.prototype as any)._getIconUrl = undefined;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: `${CDN_BASE}/marker-icon-2x.png`,
  iconUrl: `${CDN_BASE}/marker-icon.png`,
  shadowUrl: `${CDN_BASE}/marker-shadow.png`,
});

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta?: number;
  longitudeDelta?: number;
};

const deltaToZoom = (delta?: number) => {
  const d = delta ?? 0.03;
  if (d >= 1) return 8;
  if (d >= 0.3) return 10;
  if (d >= 0.1) return 12;
  if (d >= 0.05) return 13;
  if (d >= 0.02) return 14;
  if (d >= 0.01) return 15;
  return 16;
};

export const PROVIDER_DEFAULT = 'leaflet';

// Contexto para que filhos (Marker/Circle/Polyline) acessem a instância do map.
const MapContext = React.createContext<L.Map | null>(null);

type MapViewProps = {
  region: Region;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  onPress?: () => void;
  style?: any;
  children?: React.ReactNode;
};

const MapView = forwardRef<any, MapViewProps>(function MapView(
  { region, onPress, style, children },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [, force] = React.useReducer((x) => x + 1, 0);

  useEffect(() => {
    ensureLeafletCss();
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [region.latitude, region.longitude],
      zoom: deltaToZoom(region.latitudeDelta),
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    if (onPress) map.on('click', onPress);
    mapRef.current = map;
    force(); // re-render para filhos receberem o context
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Atualiza centro quando region muda externamente (sem re-criar o map)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getCenter();
    if (
      Math.abs(current.lat - region.latitude) > 0.0001 ||
      Math.abs(current.lng - region.longitude) > 0.0001
    ) {
      map.setView([region.latitude, region.longitude], deltaToZoom(region.latitudeDelta), {
        animate: true,
        duration: 0.5,
      });
    }
  }, [region.latitude, region.longitude, region.latitudeDelta]);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (r: Region, _duration = 500) => {
        const m = mapRef.current;
        if (!m) return;
        m.flyTo([r.latitude, r.longitude], deltaToZoom(r.latitudeDelta), {
          duration: 0.6,
        });
      },
    }),
    [],
  );

  return (
    <View style={[{ flex: 1, position: 'relative', overflow: 'hidden' }, style]}>
      <div
        ref={containerRef as any}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {mapRef.current && (
        <MapContext.Provider value={mapRef.current}>
          {/* Filhos invisíveis no DOM — usam a API do leaflet */}
          <div style={{ display: 'none' }}>{children}</div>
        </MapContext.Provider>
      )}
    </View>
  );
});

export { MapView };
export default MapView;

// ---------------- Marker ----------------
export const Marker = ({
  coordinate,
  onPress,
  children,
}: {
  coordinate: { latitude: number; longitude: number };
  onPress?: () => void;
  children?: React.ReactNode;
}) => {
  const map = React.useContext(MapContext);
  const markerRef = useRef<L.Marker | null>(null);

  const html = useMemo(() => {
    if (!children) return '';
    try {
      return ReactDOMServer.renderToStaticMarkup(<>{children}</> as any);
    } catch {
      return '';
    }
  }, [children]);

  useEffect(() => {
    if (!map) return;
    const icon = html
      ? L.divIcon({
          html,
          className: 'sync-marker',
          iconSize: [44, 52],
          iconAnchor: [22, 52],
        })
      : new L.Icon.Default();

    const marker = L.marker([coordinate.latitude, coordinate.longitude], { icon }).addTo(map);
    if (onPress) marker.on('click', onPress);
    markerRef.current = marker;
    return () => {
      marker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, coordinate.latitude, coordinate.longitude, html]);

  return null;
};

// ---------------- Circle ----------------
export const Circle = ({
  center,
  radius,
  strokeColor,
  fillColor,
  strokeWidth = 1,
}: {
  center: { latitude: number; longitude: number };
  radius: number;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
}) => {
  const map = React.useContext(MapContext);
  useEffect(() => {
    if (!map) return;
    const circle = L.circle([center.latitude, center.longitude], {
      radius,
      color: strokeColor || '#FF6B35',
      weight: strokeWidth,
      fillColor: fillColor || '#FF6B35',
      fillOpacity: 0.08,
    }).addTo(map);
    return () => {
      circle.remove();
    };
  }, [map, center.latitude, center.longitude, radius, strokeColor, fillColor, strokeWidth]);
  return null;
};

// ---------------- Polyline ----------------
export const Polyline = ({
  coordinates,
  strokeColor = '#FF6B35',
  strokeWidth = 4,
}: {
  coordinates: { latitude: number; longitude: number }[];
  strokeColor?: string;
  strokeWidth?: number;
}) => {
  const map = React.useContext(MapContext);
  useEffect(() => {
    if (!map) return;
    const poly = L.polyline(
      coordinates.map((c) => [c.latitude, c.longitude]) as any,
      { color: strokeColor, weight: strokeWidth, opacity: 0.9 },
    ).addTo(map);
    return () => {
      poly.remove();
    };
  }, [map, coordinates, strokeColor, strokeWidth]);
  return null;
};
