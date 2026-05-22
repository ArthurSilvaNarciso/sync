// Native: re-exporta react-native-maps. No web o Metro carrega SyncMap.web.tsx.
import React, { useEffect } from 'react';
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';

// HeatLayer stub para native — usa múltiplos <Circle> agregados.
// (mesma API do web shim para o Map screen reaproveitar.)
export const HeatLayer: React.FC<{
  points: Array<[number, number]>;
  intensity?: number;
  radiusM?: number;
  color?: string;
}> = ({ points, intensity = 0.15, radiusM = 60, color = '#FF6B35' }) => {
  // Em native, retorna fragmento com Circles — precisa estar dentro de MapView.
  return (
    <>
      {(points || []).slice(0, 500).map(([lat, lng], i) => (
        <Circle
          key={`heat-${i}`}
          center={{ latitude: lat, longitude: lng }}
          radius={radiusM}
          strokeColor="transparent"
          fillColor={`${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`}
        />
      ))}
    </>
  );
};

export { MapView, Marker, Circle, Polyline, PROVIDER_DEFAULT };
export default MapView;
