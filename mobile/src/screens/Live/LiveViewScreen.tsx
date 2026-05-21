// Tela pública de live tracking. Renderizada quando URL = /live/:token.
// Não requer login.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import MapView, { Polyline, Marker } from '../../components/map/SyncMap';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { trackingSocket, LivePoint } from '../../services/tracking-socket.service';

const ACCENT = '#FF6B35';
const API_BASE = (() => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000/api`;
  }
  return 'http://localhost:3000/api';
})();

type LiveData = {
  activityId: string;
  sport: string;
  startTime: string;
  isCompleted: boolean;
  distance: number;
  duration: number;
  points: { latitude: number; longitude: number; timestamp: string }[];
  athlete: { name?: string; avatarUrl?: string };
};

export default function LiveViewScreen({ token }: { token: string }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livePoints, setLivePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const [finished, setFinished] = useState(false);
  const mapRef = useRef<any>(null);

  // Carga inicial via REST
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/activities/live/${token}`);
        if (!r.ok) throw new Error('not_found');
        const j: LiveData = await r.json();
        setData(j);
        setLivePoints(j.points.map((p) => ({ latitude: p.latitude, longitude: p.longitude })));
        setLiveDistance(j.distance);
        setFinished(j.isCompleted);
      } catch {
        setError('Live não encontrado ou expirado');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Tick do timer
  useEffect(() => {
    if (!data || finished) return;
    const start = new Date(data.startTime).getTime();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    setElapsed(Math.floor((Date.now() - start) / 1000));
    return () => clearInterval(t);
  }, [data, finished]);

  // Socket: assina novos pontos
  useEffect(() => {
    if (!data) return;
    const off = trackingSocket.follow(
      data.activityId,
      (p: LivePoint) => {
        if (p.snapshot) return; // já temos os pontos via REST
        setLivePoints((prev) => [...prev, { latitude: p.latitude, longitude: p.longitude }]);
        setLiveDistance(p.distance);
        setLastUpdate(new Date());
        mapRef.current?.animateToRegion?.({
          latitude: p.latitude,
          longitude: p.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      },
      () => setFinished(true),
    );
    return () => {
      off();
      trackingSocket.disconnect();
    };
  }, [data?.activityId]);

  const center = useMemo(() => {
    const last = livePoints[livePoints.length - 1];
    if (last) return { latitude: last.latitude, longitude: last.longitude };
    return { latitude: -23.5505, longitude: -46.6333 };
  }, [livePoints]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Conectando ao live...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.secondaryText} />
        <Text style={styles.errorTitle}>Live indisponível</Text>
        <Text style={styles.errorText}>O atleta pode ter encerrado o compartilhamento.</Text>
      </View>
    );
  }

  const distKm = (liveDistance / 1000).toFixed(2);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const time = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  const paceMinPerKm = liveDistance > 0 ? ((elapsed / 60) / (liveDistance / 1000)).toFixed(1) : '--';

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={{
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {livePoints.length > 1 && (
          <Polyline coordinates={livePoints} strokeColor={ACCENT} strokeWidth={5} />
        )}
        {livePoints.length > 0 && (
          <Marker coordinate={livePoints[livePoints.length - 1]}>
            <View style={styles.athleteMarker}>
              <Ionicons name="walk" size={18} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Header overlay com info do atleta */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={styles.avatarRow}>
            {data.athlete.avatarUrl ? (
              <Image source={{ uri: data.athlete.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>
                  {(data.athlete.name || 'A').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.athleteName} numberOfLines={1}>
                {data.athlete.name || 'Atleta'}
              </Text>
              <View style={styles.liveRow}>
                <View style={[styles.liveDot, finished && { backgroundColor: '#888' }]} />
                <Text style={styles.liveLabel}>
                  {finished ? 'TREINO ENCERRADO' : 'AO VIVO'}
                </Text>
              </View>
            </View>
            <View style={styles.sportBadge}>
              <Text style={styles.sportText}>{data.sport.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Painel de métricas */}
      <View style={styles.metricsPanel}>
        <View style={styles.metricsInner}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{distKm}</Text>
            <Text style={styles.metricLabel}>km</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{time}</Text>
            <Text style={styles.metricLabel}>tempo</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricValue}>{paceMinPerKm}</Text>
            <Text style={styles.metricLabel}>min/km</Text>
          </View>
        </View>
        <Text style={styles.poweredBy}>
          {finished ? 'Encerrado' : `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}  •  SYNC
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.secondaryText,
    fontSize: fontSize.sm,
  },
  errorTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    alignItems: 'center',
  },
  headerInner: {
    width: '100%',
    maxWidth: 480,
    paddingHorizontal: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: borderRadius.lg,
    padding: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: ACCENT,
  },
  avatarFallback: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { color: '#fff', fontWeight: '800', fontSize: 18 },
  athleteName: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
  liveLabel: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  sportBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.4)',
  },
  sportText: { color: ACCENT, fontWeight: '800', fontSize: 10 },
  athleteMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ACCENT,
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: ACCENT,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  metricsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  metricsInner: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
  },
  metricBlock: { flex: 1, alignItems: 'center' },
  metricValue: { color: colors.text, fontSize: 28, fontWeight: '800' },
  metricLabel: {
    color: colors.secondaryText,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  poweredBy: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    marginTop: 6,
    letterSpacing: 0.5,
  },
});
