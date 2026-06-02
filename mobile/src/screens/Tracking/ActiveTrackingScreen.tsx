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
import { announce, setCoachEnabled, getCoachEnabled } from '../../services/audio-coach.service';
import { AutoPauseDetector } from '../../utils/auto-pause';
// HoldToFinishButton and ConfirmModal replaced by simple tap + Alert

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<TrackingStackParamList, 'ActiveTracking'>;
  route: RouteProp<TrackingStackParamList, 'ActiveTracking'>;
};

export default function ActiveTrackingScreen({ navigation, route }: Props) {
  const { activityId } = route.params;
  const [points, setPoints] = useState<{ latitude: number; longitude: number; altitude?: number; timestamp?: number }[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [currentAltitude, setCurrentAltitude] = useState<number | null>(null);
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }>({
    latitude: -23.5505,
    longitude: -46.6333,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [laps, setLaps] = useState<Array<{ number: number; time: number; distance: number }>>([]);
  const [lapStartTime, setLapStartTime] = useState(0);
  const [lapStartDistance, setLapStartDistance] = useState(0);
  const locationSub = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const userWeightKg = 70; // TODO: pegar do perfil do user

  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [audioOn, setAudioOn] = useState(getCoachEnabled());
  const [autoPauseOn, setAutoPauseOn] = useState(true);
  const autoPauseRef = useRef<AutoPauseDetector>(new AutoPauseDetector());
  const lastAnnouncedKmRef = useRef(0);

  useEffect(() => {
    startTracking();
    startTimer();
    trackingSocket.startBroadcasting(activityId);
    // Anúncio inicial
    if (audioOn) announce.start();
    return () => {
      locationSub.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
      trackingSocket.finish(activityId);
      trackingSocket.disconnect();
    };
  }, []);

  // Anuncia cada km cruzado
  useEffect(() => {
    const km = Math.floor(distance / 1000);
    if (audioOn && km > lastAnnouncedKmRef.current && km > 0) {
      lastAnnouncedKmRef.current = km;
      const paceRaw = distance > 0 ? (elapsed / 60) / (distance / 1000) : 0;
      const m = Math.floor(paceRaw);
      const s = Math.round((paceRaw - m) * 60);
      announce.km(km, `${m}:${s.toString().padStart(2, '0')}`);
    }
  }, [distance, audioOn]);

  const isPausedRef = useRef(false);

  const startTimer = () => {
    // Prevent duplicate intervals
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);
  };

  const startTracking = async () => {
    try {
      // Web: usa navigator.geolocation com throttle de 2s para evitar re-renders excessivos
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          Alert.alert('GPS indisponível', 'Seu navegador não suporta geolocalização.');
          return;
        }
        // Get current position first to center the map immediately
        navigator.geolocation.getCurrentPosition(
          (pos) => handleNewPoint({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            altitude: pos.coords.altitude ?? undefined,
          }),
          () => {},
          { enableHighAccuracy: true, timeout: 10000 },
        );
        let lastWebGPS = 0;
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const now = Date.now();
            if (now - lastWebGPS < 2000) return; // throttle: no more than 1 update/2s
            lastWebGPS = now;
            handleNewPoint({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude ?? undefined,
            });
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              Alert.alert('Permissão negada', 'Libere a localização no cadeado da barra de endereço.');
            }
          },
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 30000 },
        );
        locationSub.current = { remove: () => navigator.geolocation.clearWatch(id) };
        return;
      }

      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'O Sync precisa de acesso à sua localização para registrar a atividade.',
          [{ text: 'Voltar', onPress: () => navigation.goBack() }],
        );
        return;
      }

      locationSub.current = await ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.BestForNavigation,
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (location) => handleNewPoint({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? undefined,
        }),
      );
    } catch (e) {
      console.warn('[tracking] startTracking error:', e);
    }
  };

  const handleNewPoint = (newPoint: { latitude: number; longitude: number; altitude?: number }) => {
    const stampedPoint = { ...newPoint, timestamp: Date.now() };

    // Auto-pause detector
    if (autoPauseOn) {
      const action = autoPauseRef.current.push({ ...newPoint, timestamp: Date.now() });
      if (action === 'pause' && !isPaused) {
        setIsPaused(true);
        if (audioOn) announce.pause();
      } else if (action === 'resume' && isPaused) {
        setIsPaused(false);
        if (audioOn) announce.resume();
      }
    }
    setPoints((prev) => {
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const d = haversine(last.latitude, last.longitude, newPoint.latitude, newPoint.longitude);
        // Filtro de ruído: ignora saltos absurdos (>50m em 3s)
        if (d < 50) {
          setDistance((prevDist) => prevDist + d);
          // Ganho de elevação acumulado
          if (last.altitude != null && newPoint.altitude != null) {
            const diff = newPoint.altitude - last.altitude;
            if (diff > 0.5 && diff < 30) {
              setElevationGain((prev) => prev + diff);
            }
          }
        }
      }
      return [...prev, stampedPoint];
    });
    if (newPoint.altitude != null) setCurrentAltitude(newPoint.altitude);

    setRegion({
      latitude: newPoint.latitude,
      longitude: newPoint.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });

    // Streama via WebSocket (não bloqueia se falhar)
    try {
      trackingSocket.sendPoint({
        activityId,
        latitude: newPoint.latitude,
        longitude: newPoint.longitude,
        altitude: newPoint.altitude,
        timestamp: new Date().toISOString(),
      });
    } catch {}
  };

  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const togglePause = () => {
    const newPaused = !isPaused;
    isPausedRef.current = newPaused;
    if (!newPaused) {
      // Resuming: remove any stale subscription before creating a new one
      locationSub.current?.remove();
      locationSub.current = null;
      startTracking();
      startTimer();
      if (audioOn) announce.resume();
    } else {
      // Pausing
      locationSub.current?.remove();
      locationSub.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      if (audioOn) announce.pause();
    }
    setIsPaused(newPaused);
  };

  const [finishing, setFinishing] = useState(false);

  const doFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    isPausedRef.current = true;
    locationSub.current?.remove();
    locationSub.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (audioOn) announce.finish(distance / 1000, elapsed / 60);
    try {
      await api.put(`/activities/${activityId}/finish`);
      navigation.replace('ActivitySummary', { activityId });
    } catch (e: any) {
      setFinishing(false);
      // Resume timer since finish failed
      isPausedRef.current = false;
      startTimer();
      const msg = e?.response?.data?.message || 'Não foi possível finalizar. Tente novamente.';
      Alert.alert('Erro ao finalizar', Array.isArray(msg) ? msg.join(' • ') : msg);
    }
  };

  const requestFinish = () => {
    // Pause timer while user decides
    const wasRunning = !isPausedRef.current;
    if (wasRunning) {
      isPausedRef.current = true;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }

    const resume = () => {
      if (wasRunning) {
        isPausedRef.current = false;
        startTimer();
      }
    };

    const message = `Você percorreu ${(distance / 1000).toFixed(2)} km em ${Math.floor(elapsed / 60)}min. Deseja encerrar?`;

    // No WEB o Alert.alert do RN ignora os botões (vira window.alert), então o
    // callback nunca dispara. Usamos window.confirm, que funciona de verdade.
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm(`Finalizar treino?\n\n${message}`);
      if (ok) doFinish();
      else resume();
      return;
    }

    Alert.alert(
      'Finalizar treino?',
      message,
      [
        { text: 'Não, continuar', style: 'cancel', onPress: resume },
        { text: 'Sim, finalizar', style: 'destructive', onPress: doFinish },
      ],
    );
  };

  const handleFinish = requestFinish;

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
  // Pace em min:seg/km (formato real)
  const paceRaw = distance > 0 ? (elapsed / 60) / (distance / 1000) : 0;
  const pace = paceRaw > 0
    ? `${Math.floor(paceRaw)}:${Math.round((paceRaw - Math.floor(paceRaw)) * 60).toString().padStart(2, '0')}`
    : '--:--';
  const speedKmh = elapsed > 0 ? (distance / 1000) / (elapsed / 3600) : 0;
  const speed = speedKmh.toFixed(1);
  // Calorias precisas via MET (running ≈ 9.8, cycling ≈ 7.5, walking ≈ 3.5)
  // kcal = MET * weight(kg) * hours
  const speedMs = elapsed > 0 ? distance / elapsed : 0;
  const met = speedMs >= 4.0 ? 11.5 : speedMs >= 3.0 ? 9.8 : speedMs >= 2.5 ? 8.0 : speedMs >= 1.5 ? 6.0 : 3.5;
  const calories = Math.round((met * userWeightKg * elapsed) / 3600);
  const altitudeM = currentAltitude != null ? Math.round(currentAltitude) : '--';
  const elevationGainStr = elevationGain > 0 ? `+${Math.round(elevationGain)}` : '0';

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
        region={region}
        initialRegion={region}
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
            style={[styles.lockBtn, audioOn && styles.lockBtnActive]}
            onPress={() => { const next = !audioOn; setAudioOn(next); setCoachEnabled(next); }}
          >
            <Ionicons name={audioOn ? 'volume-high' : 'volume-mute'} size={18} color={audioOn ? '#fff' : colors.dark.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lockBtn, autoPauseOn && styles.lockBtnActive]}
            onPress={() => setAutoPauseOn((v) => !v)}
          >
            <Ionicons name={autoPauseOn ? 'pause-circle' : 'pause-circle-outline'} size={18} color={autoPauseOn ? '#fff' : colors.dark.text} />
          </TouchableOpacity>
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

      {/* Bottom metrics panel — Strava-style hero stats */}
      <View style={styles.bottomPanel}>
        {/* HERO: Distância grande (foco principal) */}
        <View style={styles.heroBlock}>
          <Text style={styles.heroValue}>{distanceKm}</Text>
          <Text style={styles.heroLabel}>QUILÔMETROS</Text>
        </View>

        {/* Secondary row: Tempo + Pace */}
        <View style={styles.secondaryRow}>
          <View style={styles.secondaryBox}>
            <Text style={styles.secondaryValue}>{formatTime(elapsed)}</Text>
            <Text style={styles.secondaryLabel}>Tempo</Text>
          </View>
          <View style={styles.secondaryDivider} />
          <View style={styles.secondaryBox}>
            <Text style={styles.secondaryValue}>{pace}</Text>
            <Text style={styles.secondaryLabel}>Pace /km</Text>
          </View>
        </View>

        {/* Tertiary row: calorias, BPM-like, altitude */}
        <View style={styles.tertiaryRow}>
          <View style={styles.tertiaryBox}>
            <Ionicons name="flame" size={14} color="#FF6B35" />
            <Text style={styles.tertiaryValue}>{calories}</Text>
            <Text style={styles.tertiaryLabel}>kcal</Text>
          </View>
          <View style={styles.tertiaryBox}>
            <Ionicons name="speedometer-outline" size={14} color="#3B82F6" />
            <Text style={styles.tertiaryValue}>{speed}</Text>
            <Text style={styles.tertiaryLabel}>km/h</Text>
          </View>
          <View style={styles.tertiaryBox}>
            <Ionicons name="trending-up" size={14} color="#10B981" />
            <Text style={styles.tertiaryValue}>{elevationGainStr}</Text>
            <Text style={styles.tertiaryLabel}>subida m</Text>
          </View>
          <View style={styles.tertiaryBox}>
            <Ionicons name="navigate" size={14} color="#A78BFA" />
            <Text style={styles.tertiaryValue}>{altitudeM}</Text>
            <Text style={styles.tertiaryLabel}>altitude</Text>
          </View>
        </View>

        {/* Voltas inline (apenas última) */}
        {laps.length > 0 && (
          <View style={styles.lastLap}>
            <Ionicons name="flag" size={14} color={colors.dark.accent} />
            <Text style={styles.lastLapText}>
              Última volta {laps.length}: {formatTime(laps[laps.length - 1].time)} • {(laps[laps.length - 1].distance / 1000).toFixed(2)} km
            </Text>
          </View>
        )}

        {/* Control buttons fixos no rodapé */}
        <View style={styles.controlsBar}>
          {/* ESQUERDA: Lap (running) ou placeholder (paused) */}
          <TouchableOpacity
            style={[styles.sideBtn, isPaused && { opacity: 0.4 }]}
            onPress={handleLap}
            disabled={isPaused}
          >
            <Ionicons name="flag-outline" size={22} color={colors.dark.text} />
            <Text style={styles.sideBtnLabel}>{isPaused ? `${laps.length} voltas` : `Volta ${laps.length + 1}`}</Text>
          </TouchableOpacity>

          {/* CENTRO: Pause/Resume (sempre principal) */}
          <TouchableOpacity
            style={[styles.mainControlBtn, isPaused ? styles.resumeBtn : styles.pauseBtn]}
            onPress={togglePause}
            accessibilityLabel={isPaused ? 'Retomar' : 'Pausar'}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={34} color="#fff" />
          </TouchableOpacity>

          {/* DIREITA: Finalizar — toque simples → confirmação por Alert */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={requestFinish}
            disabled={finishing}
            activeOpacity={0.7}
          >
            <Ionicons name="stop-circle" size={38} color={finishing ? '#888' : '#F87171'} />
            <Text style={[styles.sideBtnLabel, { color: finishing ? '#888' : '#F87171' }]}>
              {finishing ? 'Salvando…' : 'Finalizar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirmação agora é Alert nativo — sem ConfirmModal */}
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
    backgroundColor: '#0A0A0F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  heroBlock: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    lineHeight: 76,
  },
  heroLabel: {
    fontSize: 11,
    color: '#8E8EA0',
    letterSpacing: 2,
    fontWeight: '700',
    marginTop: 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  secondaryBox: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  secondaryLabel: {
    fontSize: 11,
    color: '#8E8EA0',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tertiaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 6,
  },
  tertiaryBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    paddingVertical: 8,
    gap: 2,
  },
  tertiaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  tertiaryLabel: {
    fontSize: 9,
    color: '#8E8EA0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastLap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderRadius: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  lastLapText: {
    color: colors.dark.text,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 72,
  },
  sideBtnLabel: {
    fontSize: 11,
    color: colors.dark.text,
    fontWeight: '600',
  },
  // LEGACY (mantido pra compat)
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
