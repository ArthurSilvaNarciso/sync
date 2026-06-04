// Jogo de conquista de territórios — mapa com células coloridas por dono,
// ranking top-3 (pódio) e captura manual da área atual.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import MapView, { Circle as RawCircle, Marker } from '../../components/map/SyncMap';

// fillOpacity existe no nosso Circle web, mas não no tipo do react-native-maps.
const Circle = RawCircle as any;
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { getCurrentLocation } from '../../services/location.service';
import { territoryApi, TerritoryCell, TerritoryLeader, TerritoryMe } from '../../services/territory.service';
import { showToast } from '../../components/ui/Toast';
import { useHaptic } from '../../hooks/useHaptic';

const ACCENT = '#FF6B35';

// Prêmios do pódio (imagens reais entram depois — placeholders por enquanto)
const PRIZES = [
  { pos: 1, emoji: '🥇', label: '1º lugar', prize: 'Troféu Sync Ouro + destaque no app' },
  { pos: 2, emoji: '🥈', label: '2º lugar', prize: 'Medalha Prata + badge exclusiva' },
  { pos: 3, emoji: '🥉', label: '3º lugar', prize: 'Medalha Bronze + badge' },
];

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a28' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b6b88' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a28' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0e1a' }] },
];

export default function TerritoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const haptic = useHaptic();
  const [region, setRegion] = useState<any>(null);
  const [cells, setCells] = useState<TerritoryCell[]>([]);
  const [leaders, setLeaders] = useState<TerritoryLeader[]>([]);
  const [me, setMe] = useState<TerritoryMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);
  const lastBox = useRef<string>('');

  const loadMeta = useCallback(async () => {
    const [lb, mine] = await Promise.all([
      territoryApi.leaderboard().catch(() => []),
      territoryApi.me().catch(() => null),
    ]);
    setLeaders(lb);
    setMe(mine);
  }, []);

  const loadCells = useCallback(async (r: any) => {
    if (!r) return;
    const minLat = r.latitude - r.latitudeDelta / 2;
    const maxLat = r.latitude + r.latitudeDelta / 2;
    const minLng = r.longitude - r.longitudeDelta / 2;
    const maxLng = r.longitude + r.longitudeDelta / 2;
    const key = `${minLat.toFixed(3)}_${minLng.toFixed(3)}_${maxLat.toFixed(3)}_${maxLng.toFixed(3)}`;
    if (key === lastBox.current) return;
    lastBox.current = key;
    try {
      const data = await territoryApi.cells({ minLat, minLng, maxLat, maxLng });
      setCells(data);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loc = await getCurrentLocation();
        const r = { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        setRegion(r);
        await Promise.all([loadCells(r), loadMeta()]);
      } catch {
        // sem localização — região padrão (Brasil)
        const r = { latitude: -22.4707, longitude: -44.4509, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        setRegion(r);
        await loadMeta();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCells, loadMeta]);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      const loc = await getCurrentLocation();
      const res = await territoryApi.claim([{ lat: loc.latitude, lng: loc.longitude }]);
      haptic.success();
      showToast(
        res.claimed > 0 ? `Área conquistada! 🚩 (${res.totalOwned} no total)` : 'Essa área já é sua 😎',
        'success',
      );
      lastBox.current = ''; // força refetch
      const r = { latitude: loc.latitude, longitude: loc.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      setRegion(r);
      await Promise.all([loadCells(r), loadMeta()]);
    } catch {
      showToast('Não foi possível capturar. Verifique o GPS.', 'error');
    } finally {
      setCapturing(false);
    }
  };

  const podium = [leaders[1], leaders[0], leaders[2]].filter(Boolean) as TerritoryLeader[];
  const podiumHeights: Record<number, number> = { 1: 56, 2: 42, 3: 34 };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Carregando territórios…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mapa */}
      {region && (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          onRegionChangeComplete={(r: any) => loadCells(r)}
          userInterfaceStyle="dark"
          customMapStyle={darkMapStyle}
        >
          {cells.map((c) => (
            <Circle
              key={c.cellId}
              center={{ latitude: c.lat, longitude: c.lng }}
              radius={75}
              strokeColor={c.ownerColor}
              strokeWidth={1}
              fillColor={c.ownerColor}
              fillOpacity={0.45}
            />
          ))}
          {region && (
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }}>
              <View style={styles.meDot}>
                <Ionicons name="navigate" size={12} color="#fff" />
              </View>
            </Marker>
          )}
        </MapView>
      )}

      {/* Header com pódio top-3 */}
      <LinearGradient
        colors={['rgba(10,10,15,0.95)', 'rgba(10,10,15,0.0)']}
        style={[styles.header, { paddingTop: Math.max(insets.top + 8, 44) }]}
        pointerEvents="box-none"
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Territórios 🚩</Text>
          <TouchableOpacity onPress={() => setShowPrizes((v) => !v)} style={styles.iconBtn}>
            <Ionicons name="gift" size={18} color="#FCD34D" />
          </TouchableOpacity>
        </View>

        {podium.length > 0 && (
          <View style={styles.podium}>
            {podium.map((l) => (
              <View key={l.userId} style={styles.podiumCol}>
                <View style={[styles.podiumAvatar, { backgroundColor: l.color, borderColor: l.position === 1 ? '#FCD34D' : 'transparent' }]}>
                  <Text style={styles.podiumInitial}>{l.name?.[0]?.toUpperCase() || '?'}</Text>
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{l.name?.split(' ')[0]}</Text>
                <Text style={styles.podiumCells}>{l.cells}</Text>
                <View style={[styles.podiumBar, { height: podiumHeights[l.position], backgroundColor: l.position === 1 ? '#FCD34D' : 'rgba(255,107,53,0.6)' }]}>
                  <Text style={styles.podiumPos}>{l.position}º</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* Prêmios (toggle) */}
      {showPrizes && (
        <View style={[styles.prizesCard, { top: Math.max(insets.top + 8, 44) + 200 }]}>
          <Text style={styles.prizesTitle}>🏆 Prêmios do mês</Text>
          {PRIZES.map((p) => (
            <View key={p.pos} style={styles.prizeRow}>
              <Text style={styles.prizeEmoji}>{p.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.prizeLabel}>{p.label}</Text>
                <Text style={styles.prizeDesc}>{p.prize}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.prizesHint}>Conquiste mais áreas que todo mundo até o fim do mês!</Text>
        </View>
      )}

      {/* Footer: minha posição + capturar */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 80 }]} pointerEvents="box-none">
        {me && (
          <View style={styles.myStats}>
            <View style={[styles.myColorDot, { backgroundColor: me.color }]} />
            <Text style={styles.myStatsText}>
              {me.position ? `Você está em ${me.position}º` : 'Sem território ainda'} · {me.cells} área{me.cells === 1 ? '' : 's'}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={capturing} activeOpacity={0.85}>
          <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.captureInner}>
            {capturing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="flag" size={18} color="#fff" />
                <Text style={styles.captureText}>Capturar minha área</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.footerHint}>Dica: ande pela cidade durante um treino pra pintar as ruas da sua cor 🎨</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  loadingWrap: { flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { color: colors.dark.secondaryText, fontSize: fontSize.md },

  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },

  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.md },
  podiumCol: { alignItems: 'center', width: 72 },
  podiumAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  podiumInitial: { color: '#fff', fontWeight: '900', fontSize: 16 },
  podiumName: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 3, maxWidth: 70 },
  podiumCells: { color: '#FCD34D', fontSize: 12, fontWeight: '800' },
  podiumBar: { width: '80%', borderTopLeftRadius: 6, borderTopRightRadius: 6, marginTop: 4, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 3 },
  podiumPos: { color: '#0A0A0F', fontWeight: '900', fontSize: 12 },

  prizesCard: {
    position: 'absolute', left: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(15,15,24,0.97)', borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: 'rgba(252,211,77,0.35)', padding: spacing.md, gap: spacing.sm,
  },
  prizesTitle: { color: '#fff', fontWeight: '800', fontSize: fontSize.md, marginBottom: 4 },
  prizeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  prizeEmoji: { fontSize: 26 },
  prizeLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  prizeDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  prizesHint: { color: '#FCD34D', fontSize: 11, marginTop: 4, fontWeight: '600' },

  meDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
  },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, gap: spacing.sm },
  myStats: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center',
    backgroundColor: 'rgba(15,15,24,0.9)', paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  myColorDot: { width: 12, height: 12, borderRadius: 6 },
  myStatsText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  captureBtn: {
    borderRadius: borderRadius.full, overflow: 'hidden',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  captureInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  captureText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  footerHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' },
});
