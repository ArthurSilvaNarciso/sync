import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapStackParamList } from '../../navigation/types';
import { Event as EventType } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSportImage, emptyImages } from '../../theme/images';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../services/api';

type Props = {
  navigation: NativeStackNavigationProp<MapStackParamList, 'MyEvents'>;
};

const sportIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  running: 'walk',
  cycling: 'bicycle',
  swimming: 'water',
  football: 'football',
  basketball: 'basketball',
  tennis: 'tennisball',
  yoga: 'body',
  gym: 'barbell',
  hiking: 'trail-sign',
};

const sportColors: Record<string, string> = {
  running: '#FF6B35',
  cycling: '#2E7BFF',
  swimming: '#00BCD4',
  football: '#4CAF50',
  basketball: '#FF9800',
  gym: '#F44336',
  yoga: '#8BC34A',
  hiking: '#795548',
};

type Tab = 'created' | 'participating';

export default function MyEventsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('created');
  const [created, setCreated] = useState<EventType[]>([]);
  const [participating, setParticipating] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyEvents();
  }, []);

  const loadMyEvents = async () => {
    try {
      const { data } = await api.get('/events/my');
      setCreated(data.created || []);
      setParticipating(data.participating || []);
    } catch {
      // sem dados
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyEvents();
    setRefreshing(false);
  };

  const handleCancelEvent = (eventId: string, title: string) => {
    Alert.alert(
      'Cancelar evento',
      `Deseja cancelar o evento "${title}"? Esta ação não pode ser desfeita.`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Cancelar evento',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/events/${eventId}`);
              setCreated((prev) => prev.filter((e) => e.id !== eventId));
              Alert.alert('Pronto', 'Evento cancelado com sucesso.');
            } catch {
              Alert.alert('Erro', 'Nao foi possivel cancelar o evento.');
            }
          },
        },
      ],
    );
  };

  const handleLeaveEvent = (eventId: string, title: string) => {
    Alert.alert(
      'Sair do evento',
      `Deseja sair do evento "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/events/${eventId}/leave`);
              setParticipating((prev) => prev.filter((e) => e.id !== eventId));
            } catch {
              Alert.alert('Erro', 'Nao foi possivel sair do evento.');
            }
          },
        },
      ],
    );
  };

  const renderEvent = ({ item }: { item: EventType }) => {
    const color = sportColors[item.sport] || colors.primary;
    const isPast = new Date(item.date) < new Date();
    const isCreated = tab === 'created';

    return (
      <TouchableOpacity
        style={[styles.eventCard, isPast && styles.eventCardPast]}
        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
        activeOpacity={0.85}
      >
        <ImageBackground
          source={{ uri: getSportImage(item.sport) }}
          style={styles.eventThumb}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(10,10,15,0.1)', 'rgba(10,10,15,0.85)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.thumbBadge, { backgroundColor: color }]}>
            <Ionicons
              name={sportIcons[item.sport] || 'calendar'}
              size={14}
              color={colors.white}
            />
          </View>
        </ImageBackground>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.eventDate}>
            {new Date(item.date).toLocaleDateString('pt-BR', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.address && (
            <Text style={styles.eventAddress} numberOfLines={1}>
              <Ionicons name="location-outline" size={11} color={colors.dark.secondaryText} /> {item.address}
            </Text>
          )}
        </View>
        {!isPast && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              isCreated
                ? handleCancelEvent(item.id, item.title)
                : handleLeaveEvent(item.id, item.title)
            }
          >
            <Ionicons
              name={isCreated ? 'trash-outline' : 'exit-outline'}
              size={18}
              color={colors.error}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const currentList = tab === 'created' ? created : participating;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#15152E', '#0E0E1E', '#0A0A0F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meus Eventos</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'created' && styles.tabActive]}
          onPress={() => setTab('created')}
        >
          <Text style={[styles.tabText, tab === 'created' && styles.tabTextActive]}>
            Criados ({created.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'participating' && styles.tabActive]}
          onPress={() => setTab('participating')}
        >
          <Text style={[styles.tabText, tab === 'participating' && styles.tabTextActive]}>
            Participando ({participating.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={["#FF6B35"]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              image={emptyImages.noEvents}
              icon={tab === 'created' ? 'add-circle-outline' : 'calendar-outline'}
              title={
                tab === 'created'
                  ? 'Crie seu primeiro evento'
                  : 'Você ainda não participa de eventos'
              }
              subtitle={
                tab === 'created'
                  ? 'Organize uma corrida, pedal ou treino e reúna a galera.'
                  : 'Procure no Mapa eventos próximos e bata ponto.'
              }
              ctaLabel={tab === 'created' ? 'Criar evento' : undefined}
              onCtaPress={tab === 'created' ? () => navigation.navigate('CreateEvent') : undefined}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0F',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B35',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#FF6B35',
    fontWeight: '700',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderRadius: borderRadius.md,
    padding: 10,
    marginBottom: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  eventCardPast: {
    opacity: 0.6,
  },
  eventThumb: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  thumbBadge: {
    margin: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  eventDate: {
    fontSize: fontSize.xs,
    color: '#FF6B35',
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  eventAddress: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  createBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  createBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
});
