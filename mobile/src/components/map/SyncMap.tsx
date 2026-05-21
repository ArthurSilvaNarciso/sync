// Native: re-exporta react-native-maps. No web o Metro carrega SyncMap.web.tsx.
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

export { MapView, Marker, Circle, Polyline, PROVIDER_DEFAULT };
export default MapView;
