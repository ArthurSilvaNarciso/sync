import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TrackingStackParamList } from '../../navigation/types';
import { Activity } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<TrackingStackParamList, 'ActivityHistory'>;
};

const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'walk-outline',
  cycling: 'bicycle-outline',
  swimming: 'water-outline',
  hiking: 'trail-sign-outline',
  gym: 'barbell-outline',
};

const sportLabels: Record<string, string> = {
  running: 'Corrida',
  cycling: 'Ciclismo',
  swimming: 'Natacao',
  hiking: 'Trilha',
  gym: 'Academia',
};

export default function ActivityHistoryScreen({ navigation }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const { data } = await api.get('/activities/history');
      setActivities(data[0]);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  const renderItem = ({ item }: { item: Activity }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ActivitySummary', { activityId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.sportIconWrap}>
          <Ionicons
            name={sportIcons[item.sport] || 'fitness-outline'}
            size={20}
            color={colors.dark.accent}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.sportName}>
            {sportLabels[item.sport] || item.sport}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.startTime).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}{' '}
            {new Date(item.startTime).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.dark.secondaryText} />
      </View>
      <View style={styles.cardMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {(item.distance / 1000).toFixed(2)}
          </Text>
          <Text style={styles.metricLabel}>km</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {formatDuration(item.duration)}
          </Text>
          <Text style={styles.metricLabel}>tempo</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {item.avgPace?.toFixed(1) || '--'}
          </Text>
          <Text style={styles.metricLabel}>min/km</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {item.avgSpeed?.toFixed(1) || '--'}
          </Text>
          <Text style={styles.metricLabel}>km/h</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Group by month
  const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
  const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
  const totalActivities = activities.length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Historico</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      {/* Summary stats */}
      {!loading && activities.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalActivities}</Text>
            <Text style={styles.summaryLabel}>Atividades</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {(totalDistance / 1000).toFixed(1)}
            </Text>
            <Text style={styles.summaryLabel}>km total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {Math.floor(totalDuration / 3600) > 0
                ? `${Math.floor(totalDuration / 3600)}h${Math.floor((totalDuration % 3600) / 60)}m`
                : `${Math.floor(totalDuration / 60)}m`}
            </Text>
            <Text style={styles.summaryLabel}>tempo total</Text>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.dark.accent}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={activities}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={48} color="rgba(255,255,255,0.20)" />
              <Text style={styles.emptyTitle}>Nenhuma atividade</Text>
              <Text style={styles.emptyText}>
                Comece a treinar para ver seu historico aqui
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.dark.accent,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.dark.border,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark.accent + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  sportName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.dark.text,
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.dark.secondaryText,
    marginTop: 2,
  },
  cardMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.dark.text,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 10,
    color: colors.dark.secondaryText,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.dark.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.dark.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.dark.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
