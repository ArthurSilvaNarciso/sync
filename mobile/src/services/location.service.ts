// Serviço de localização — SEM fallback silencioso pra SP.
// Sempre tenta GPS real do usuário. Se falhar, propaga erro.
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  isReal: true; // marcador de que veio do GPS real
}

export class LocationDeniedError extends Error {
  constructor(message = 'Permissão de localização negada') {
    super(message);
    this.name = 'LocationDeniedError';
  }
}

export class LocationUnavailableError extends Error {
  constructor(message = 'Não foi possível obter a localização') {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

let cachedLocation: LocationCoords | null = null;

/**
 * Pega a localização REAL do usuário.
 * No WEB: usa navigator.geolocation diretamente (mais confiável que expo-location).
 * Na NATIVE: usa expo-location com fallback de accuracy.
 * NUNCA retorna fallback fake — lança erro se não conseguir.
 */
export async function getCurrentLocation(): Promise<LocationCoords> {
  if (Platform.OS === 'web') {
    return getWebLocation();
  }
  return getNativeLocation();
}

async function getWebLocation(): Promise<LocationCoords> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new LocationUnavailableError('Geolocalização não suportada neste navegador');
  }

  return new Promise<LocationCoords>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LocationCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isReal: true,
        };
        cachedLocation = coords;
        resolve(coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new LocationDeniedError(
            'Permissão de localização negada. Libere nas configurações do navegador (cadeado na barra de endereço).',
          ));
        } else {
          reject(new LocationUnavailableError(
            err.code === err.TIMEOUT
              ? 'Timeout — tente novamente em uma área aberta'
              : 'Não foi possível obter sua posição',
          ));
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

async function getNativeLocation(): Promise<LocationCoords> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new LocationDeniedError(
      'Permissão de localização negada. Ative em Ajustes → Sync.',
    );
  }

  // High accuracy primeiro
  try {
    const loc = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.High,
    });
    const coords: LocationCoords = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      isReal: true,
    };
    cachedLocation = coords;
    return coords;
  } catch {
    // tenta balanceada
  }

  try {
    const loc = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });
    const coords: LocationCoords = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? undefined,
      isReal: true,
    };
    cachedLocation = coords;
    return coords;
  } catch {
    // tenta last known
  }

  const lastKnown = await ExpoLocation.getLastKnownPositionAsync().catch(() => null);
  if (lastKnown) {
    const coords: LocationCoords = {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      accuracy: lastKnown.coords.accuracy ?? undefined,
      isReal: true,
    };
    cachedLocation = coords;
    return coords;
  }

  throw new LocationUnavailableError(
    'GPS não retornou posição. Saia para área aberta e tente novamente.',
  );
}

/**
 * Watch contínuo. No web usa navigator.geolocation.watchPosition.
 */
export async function watchLocation(
  callback: (coords: LocationCoords) => void,
  options?: { distanceInterval?: number; timeInterval?: number },
): Promise<{ remove: () => void } | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: LocationCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isReal: true,
        };
        cachedLocation = coords;
        callback(coords);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return { remove: () => navigator.geolocation.clearWatch(id) };
  }

  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const sub = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
        distanceInterval: options?.distanceInterval ?? 5,
        timeInterval: options?.timeInterval ?? 3000,
      },
      (loc) => {
        const coords: LocationCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? undefined,
          isReal: true,
        };
        cachedLocation = coords;
        callback(coords);
      },
    );
    return { remove: () => sub.remove() };
  } catch {
    return null;
  }
}

export function getCachedLocation(): LocationCoords | null {
  return cachedLocation;
}

export function clearLocationCache(): void {
  cachedLocation = null;
}
