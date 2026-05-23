import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  ActionSheetIOS,
} from 'react-native';
import MapView, { Polyline, Marker } from '../../components/map/SyncMap';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackingStackParamList } from '../../navigation/types';
import { Activity } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { feedApi } from '../../services/feed.service';
import { generateWorkoutSummary } from '../../utils/workout-summary';
import { showToast } from '../../components/ui/Toast';
import PostWorkoutRatingModal from '../../components/PostWorkoutRatingModal';

type Props = {
  navigation: NativeStackNavigationProp<TrackingStackParamList, 'ActivitySummary'>;
  route: RouteProp<TrackingStackParamList, 'ActivitySummary'>;
};

export default function ActivitySummaryScreen({ navigation, route }: Props) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [ratingModal, setRatingModal] = useState(true); // abre auto após finish

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      const { data } = await api.get(`/activities/${route.params.activityId}`);
      setActivity(data);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!activity) return;
    try {
      await Share.share({
        message: `Completei ${(activity.distance / 1000).toFixed(2)}km em ${formatDuration(activity.duration)}! #Sync #${activity.sport}`,
      });
    } catch {
      // compartilhamento cancelado
    }
  };

  const generateGpx = (): string => {
    if (!activity?.points?.length) return '';
    const points = activity.points
      .map(
        (p) =>
          `    <trkpt lat="${p.latitude}" lon="${p.longitude}">\n      <time>${p.timestamp}</time>${p.altitude != null ? `\n      <ele>${p.altitude}</ele>` : ''}\n    </trkpt>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Sync App">
  <trk>
    <name>${activity.sport} - ${new Date(activity.startTime).toLocaleDateString('pt-BR')}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>`;
  };

  const generateCsv = (): string => {
    if (!activity?.points?.length) return '';
    const header = 'latitude,longitude,altitude,timestamp';
    const rows = activity.points.map(
      (p) => `${p.latitude},${p.longitude},${p.altitude ?? ''},${p.timestamp}`,
    );
    return [header, ...rows].join('\n');
  };

  const handleExport = () => {
    if (!activity) return;

    const doExport = (format: 'gpx' | 'csv') => {
      const content = format === 'gpx' ? generateGpx() : generateCsv();
      if (!content) {
        Alert.alert('Sem dados', 'Esta atividade nao tem pontos GPS para exportar.');
        return;
      }
      Share.share({
        title: `atividade_${activity.sport}_${new Date(activity.startTime).toISOString().slice(0, 10)}.${format}`,
        message: content,
      }).catch(() => {});
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancelar', 'Exportar GPX', 'Exportar CSV'], cancelButtonIndex: 0 },
        (index) => {
          if (index === 1) doExport('gpx');
          if (index === 2) doExport('csv');
        },
      );
    } else {
      Alert.alert('Exportar atividade', '', [
        { text: 'Exportar GPX', onPress: () => doExport('gpx') },
        { text: 'Exportar CSV', onPress: () => doExport('csv') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  if (loading || !activity) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.dark.accent} />
      </View>
    );
  }

  const coordinates = activity.points?.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  })) || [];

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const sportLabels: Record<string, string> = {
    running: 'Corrida',
    cycling: 'Ciclismo',
    swimming: 'Natacao',
    hiking: 'Trilha',
    gym: 'Academia',
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.popToTop()}
          >
            <Ionicons name="close" size={24} color={colors.dark.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Resumo</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.dark.accent} />
          </TouchableOpacity>
        </View>

        {/* Sport badge + date */}
        <View style={styles.sportBadge}>
          <Text style={styles.sportText}>
            {sportLabels[activity.sport] || activity.sport}
          </Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(activity.startTime).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        {/* Main stat - distance */}
        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>
            {(activity.distance / 1000).toFixed(2)}
          </Text>
          <Text style={styles.mainStatUnit}>km</Text>
        </View>

        {/* Map with route */}
        {coordinates.length > 0 && (
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: coordinates[0].latitude,
                longitude: coordinates[0].longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
              scrollEnabled={false}
              userInterfaceStyle="dark"
              customMapStyle={darkMapStyle}
            >
              <Polyline
                coordinates={coordinates}
                strokeColor={colors.dark.accent}
                strokeWidth={4}
              />
              <Marker coordinate={coordinates[0]}>
                <View style={styles.marker}>
                  <Ionicons name="flag" size={10} color={colors.white} />
                </View>
              </Marker>
              {coordinates.length > 1 && (
                <Marker coordinate={coordinates[coordinates.length - 1]}>
                  <View style={[styles.marker, styles.endMarker]}>
                    <Ionicons name="checkmark" size={10} color={colors.white} />
                  </View>
                </Marker>
              )}
            </MapView>
          </View>
        )}

        {/* Metrics grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Ionicons name="time-outline" size={20} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {formatDuration(activity.duration)}
            </Text>
            <Text style={styles.metricLabel}>Tempo total</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="speedometer-outline" size={20} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {activity.avgPace?.toFixed(2) || '--'}
            </Text>
            <Text style={styles.metricLabel}>Ritmo (min/km)</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="flash-outline" size={20} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {activity.avgSpeed?.toFixed(1) || '--'}
            </Text>
            <Text style={styles.metricLabel}>Velocidade (km/h)</Text>
          </View>
          <View style={styles.metricCard}>
            <Ionicons name="flame-outline" size={20} color={colors.dark.accent} />
            <Text style={styles.metricValue}>
              {Math.round((activity.distance / 1000) * 60)}
            </Text>
            <Text style={styles.metricLabel}>Calorias (kcal)</Text>
          </View>
        </View>

        {/* Resumo natural */}
        <View style={styles.summaryBox}>
          <Ionicons name="sparkles" size={16} color={colors.dark.accent} />
          <Text style={styles.summaryText}>
            {generateWorkoutSummary({
              distanceKm: activity.distance / 1000,
              durationMinutes: activity.duration / 60,
              avgPaceMinPerKm: activity.avgPace || 0,
              calories: Math.round((activity.distance / 1000) * 60),
              sport: activity.sport,
            })}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {!posted && (
            <Button
              title={posting ? 'Publicando…' : '📢 Postar no feed'}
              loading={posting}
              onPress={async () => {
                if (!activity || posting) return;
                setPosting(true);
                try {
                  await feedApi.publish({
                    activityId: activity.id,
                    caption: `Mais um treino no Sync! 🔥`,
                    distanceKm: activity.distance / 1000,
                    durationSeconds: activity.duration,
                    avgPace: activity.avgPace,
                    calories: Math.round((activity.distance / 1000) * 60),
                    sport: activity.sport,
                  });
                  setPosted(true);
                  showToast('Publicado no feed! 🎉', 'success');
                } catch (e: any) {
                  showToast(e?.response?.data?.message || 'Erro ao publicar', 'error');
                } finally {
                  setPosting(false);
                }
              }}
              style={styles.actionBtn}
            />
          )}
          {posted && (
            <View style={[styles.exportBtn, { borderColor: '#22C55E' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
              <Text style={[styles.exportBtnText, { color: '#22C55E' }]}>Publicado no feed</Text>
            </View>
          )}
          {activity.points && activity.points.length > 0 && (
            <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
              <Ionicons name="download-outline" size={18} color={colors.dark.accent} />
              <Text style={styles.exportBtnText}>Exportar rota (GPX/CSV)</Text>
            </TouchableOpacity>
          )}
          <Button
            title="Voltar ao inicio"
            variant="outline"
            onPress={() => navigation.popToTop()}
            style={styles.actionBtn}
          />
        </View>
      </ScrollView>

      {/* Modal de rating pós-treino (Adidas RC style) */}
      <PostWorkoutRatingModal
        visible={ratingModal && !!activity?.id}
        activityId={activity?.id || null}
        onClose={() => setRatingModal(false)}
        onSaved={() => setRatingModal(false)}
      />
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d1d2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8e8ea0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d2e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a40' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#252540' }] },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.dark.text,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportBadge: {
    alignSelf: 'center',
    backgroundColor: colors.dark.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  sportText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  dateText: {
    fontSize: fontSize.sm,
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  mainStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  mainStatValue: {
    fontSize: 64,
    fontWeight: '200',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  mainStatUnit: {
    fontSize: fontSize.xl,
    color: colors.dark.secondaryText,
    marginLeft: spacing.sm,
  },
  mapContainer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    height: 200,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.dark.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,230,118,0.3)',
  },
  endMarker: {
    backgroundColor: colors.dark.accent,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  metricCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.dark.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    color: colors.dark.secondaryText,
    textTransform: 'uppercase',
  },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,107,53,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
  },
  summaryText: {
    flex: 1,
    color: colors.dark.text,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  actionBtn: {
    marginBottom: spacing.md,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dark.accent + '15',
    borderWidth: 1,
    borderColor: colors.dark.accent + '30',
    marginBottom: spacing.md,
  },
  exportBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.dark.accent,
  },
});
