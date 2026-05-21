import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Polyline, Marker } from '../../components/map/SyncMap';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackingStackParamList } from '../../navigation/types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import api from '../../services/api';
import { trackingSocket } from '../../services/tracking-socket.service';
import { Share } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<TrackingStackParamList, 'ActiveTracking'>;
  route: RouteProp<TrackingStackParamList, 'ActiveTracking'>;
};

export default function ActiveTrackingScreen({ navigation, route }: Props) {
  const { activityId } = route.params;
  const [points, setPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [laps, setLaps] = useState<Array<{ number: number; time: number; distance: number }>>([]);
  const [lapStartTime, setLapStartTime] = useState(0);
  const [lapStartDistance, setLapStartDistance] = useState(0);
  const locationSub = useRef<ExpoLocation.LocationSubscription | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<MapView>(null);

  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    startTracking();
    startTimer();
    // Inicia broadcast da atividade no socket (cria sala /tracking/activity:<id>)
    trackingSocket.startBroadcasting(activityId);
    return () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      trackingSocket.finish(activityId);
      trackingSocket.disconnect();
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  };

  const startTracking = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'O Sync precisa de acesso à sua localização para registrar a atividade. Ative nas configurações do dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => navigation.goBack() },
          { text: 'Abrir Configurações', onPress: () => ExpoLocation.enableNetworkProviderAsync().catch(() => {}) },
        ],
      );
      return;
    }

    locationSub.current = await ExpoLocation.watchPositionAsync(
      {
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (location) => {
        const newPoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversine(last.latitude, last.longitude, newPoint.latitude, newPoint.longitude);
            setDistance((prevDist) => prevDist + d);
          }
          return [...prev, newPoint];
        });

        // Streama via WebSocket — backend persiste em batch a cada 3s
        trackingSocket.sendPoint({
          activityId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? undefined,
          timestamp: new Date().toISOString(),
        });

        mapRef.current?.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      },
    );
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const togglePause = () => {
    if (isPaused) {
      startTracking();
      startTimer();
    } else {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    }
    setIsPaused(!isPaused);
  };

  const handleFinish = () => {
    Alert.alert('Finalizar', 'Deseja encerrar a atividade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          locationSub.current?.remove();
          if (timerRef.current) clearInterval(timerRef.current);
          try {
            await api.put(`/activities/${activityId}/finish`);
            navigation.replace('ActivitySummary', { activityId });
          } catch {
            Alert.alert('Erro', 'Nao foi possivel finalizar a atividade. Tente novamente.');
          }
        },
      },
    ]);
  };

  const handleShareLive = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { data } = await api.post(`/activities/${activityId}/share`);
      // Constrói URL pública baseado no host atual (web) ou domínio fixo (mobile)
      const base = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}`
        : 'https://sync.app';
      const url = `${base}/live/${data.liveToken}`;
      setLiveUrl(url);
      try {
        await Share.share({
          message: `Acompanhe meu treino ao vivo no Sync: ${url}`,
          url,
        });
      } catch {
        // Web não suporta Share.share — só guardamos a URL no estado
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.response?.data?.message || 'Não foi possível gerar o link');
    } finally {
      setSharing(false);
    }
  };

  const handleLap = () => {
    const lapTime = elapsed - lapStartTime;
    const lapDist = distance - lapStartDistance;
    const newLap = {
      number: laps.length + 1,
      time: lapTime,
      distance: lapDist,
    };
    setLaps((prev) => [...prev, newLap]);
    setLapStartTime(elapsed);
    setLapStartDistance(distance);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const distanceKm = (distance / 1000).toFixed(2);
  const pace = distance > 0 ? ((elapsed / 60) / (distance / 1000)).toFixed(2) : '--:--';
  const speed = elapsed > 0 ? ((distance / 1000) / (elapsed / 3600)).toFixed(1) : '0.0';
  const calories = Math.round((distance / 1000) * 60); // rough estimate

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        followsUserLocation
        userInterfaceStyle="dark"
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: points[0]?.latitude || -23.5505,
          longitude: points[0]?.longitude || -46.6333,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {points.length > 1 && (
          <Polyline
            coordinates={points}
            strokeColor={colors.dark.accent}
            strokeWidth={5}
          />
        )}
        {points.length > 0 && (
          <Marker coordinate={points[0]}>
            <View style={styles.startMarker}>
              <Ionicons name="flag" size={12} color={colors.white} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top status bar */}
      <View style={styles.topOverlay}>
        <View style={styles.topStatus}>
          {isPaused && (
            <View style={styles.pausedBadge}>
              <Text style={styles.pausedText}>PAUSADO</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.lockBtn, liveUrl && styles.lockBtnActive]}
            onPress={handleShareLive}
            disabled={sharing}
          >
            <Ionicons
              name={liveUrl ? 'radio' : 'share-social-outline'}
              size={18}
              color={liveUrl ? colors.white : colors.dark.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lockBtn}
            onPress={() => setIsLocked(!isLocked)}
          >
            <Ionicons
              name={isLocked ? 'lock-closed' : 'lock-open-outline'}
              size={18}
              color={colors.dark.text}
            />
          </TouchableOpacity>
        </View>
        {liveUrl && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText} numberOfLines={1}>
              AO VIVO • {liveUrl.replace(/^https?:\/\//, '')}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom metrics panel */}
      <View style={styles.bottomPanel}>
        {/* Timer - most prominent */}
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>

        {/* Metrics grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{distanceKm}</Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{pace}</Text>
            <Text style={styles.metricLabel}>min/km</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{speed}</Text>
            <Text style={styles.metricLabel}>km/h</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>{calories}</Text>
            <Text style={styles.metricLabel}>kcal</Text>
          </View>
        </View>

        {/* Laps display */}
        {laps.length > 0 && (
          <View style={styles.lapsContainer}>
            <Text style={styles.lapsTitle}>Últimas voltas</Text>
            {laps.slice(-3).reverse().map((lap) => (
              <View key={lap.number} style={styles.lapRow}>
                <Text style={styles.lapNumber}>Volta {lap.number}</Text>
                <Text style={styles.lapTime}>{formatTime(lap.time)}</Text>
                <Text style={styles.lapDist}>{(lap.distance / 1000).toFixed(2)} km</Text>
              </View>
            ))}
          </View>
        )}

        {/* Control buttons */}
        <View style={styles.controls}>
          {isPaused ? (
            <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
              <Ionicons name="stop" size={24} color={colors.white} />
              <Text style={styles.controlLabel}>Finalizar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.lapBtn} onPress={handleLap}>
              <Ionicons name="flag-outline" size={24} color={colors.dark.text} />
              <Text style={styles.controlLabel}>Volta {laps.length + 1}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.mainControlBtn, isPaused ? styles.resumeBtn : styles.pauseBtn]}
            onPress={togglePause}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={32}
              color={colors.white}
            />
          </TouchableOpacity>

          {isPaused ? (
            <TouchableOpacity style={styles.lapBtn} onPress={() => { setIsPaused(false); startTracking(); startTimer(); }}>
              <Ionicons name="refresh-outline" size={24} color={colors.dark.text} />
              <Text style={styles.controlLabel}>Continuar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.lapBtn}>
              <Text style={[styles.controlLabel, { fontSize: 16, fontWeight: '700', color: colors.dark.text }]}>
                {laps.length}
              </Text>
              <Text style={styles.controlLabel}>Voltas</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8ea0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252540' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#252540' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  map: {
    flex: 1,
  },
  startMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.dark.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: spacing.md,
    right: spacing.md,
  },
  topStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pausedBadge: {
    backgroundColor: colors.dark.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  pausedText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 1,
  },
  lockBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.mapOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  lockBtnActive: {
    backgroundColor: '#FF6B35',
  },
  liveBadge: {
    marginTop: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,107,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 260,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF8A5C',
    letterSpacing: 0.5,
  },
  bottomPanel: {
    backgroundColor: colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  timer: {
    fontSize: 56,
    fontWeight: '200',
    color: colors.dark.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    color: colors.dark.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.dark.border,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  mainControlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  pauseBtn: {
    backgroundColor: colors.dark.accent,
    shadowColor: colors.dark.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  resumeBtn: {
    backgroundColor: colors.dark.success,
    shadowColor: colors.dark.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  finishBtn: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  lapBtn: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  controlLabel: {
    fontSize: 11,
    color: colors.dark.secondaryText,
  },
  lapsContainer: {
    marginBottom: spacing.sm,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  lapsTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  lapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  lapNumber: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    flex: 1,
  },
  lapTime: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
    flex: 1,
    textAlign: 'center',
  },
  lapDist: {
    fontSize: fontSize.xs,
    color: colors.dark.accent,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});
