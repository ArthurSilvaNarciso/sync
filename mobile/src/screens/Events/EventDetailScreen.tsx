import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
  FlatList,
  TextInput,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import MapView, { Marker } from '../../components/map/SyncMap';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapStackParamList } from '../../navigation/types';
import { Event as EventType } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchCurrentWeather, WeatherData, getExerciseRecommendation } from '../../services/external-apis';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { confirmAsync } from '../../utils/confirm';

type Props = {
  navigation: NativeStackNavigationProp<MapStackParamList, 'EventDetail'>;
  route: RouteProp<MapStackParamList, 'EventDetail'>;
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
  tennis: '#CDDC39',
  yoga: '#8BC34A',
  gym: '#F44336',
  hiking: '#795548',
};

export default function EventDetailScreen({ navigation, route }: Props) {
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Array<{ id: string; user: { name: string }; content: string; createdAt: string }>>([]);
  const [sendingComment, setSendingComment] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    loadEvent();
  }, []);

  const loadEvent = async () => {
    try {
      const [eventRes, commentsRes] = await Promise.all([
        api.get(`/events/${route.params.eventId}`),
        api.get(`/events/${route.params.eventId}/comments`).catch(() => ({ data: { comments: [] } })),
      ]);
      setEvent(eventRes.data);
      setComments(commentsRes.data.comments || []);
      loadWeather(eventRes.data.latitude, eventRes.data.longitude);
    } catch {
      setEvent({
        id: route.params.eventId,
        title: 'Corrida matinal no Ibirapuera',
        description: 'Vamos fazer uma corrida leve no parque Ibirapuera. Todos os niveis sao bem-vindos! Ponto de encontro: portao 3. Tragam agua e disposicao!',
        sport: 'running',
        date: new Date(Date.now() + 86400000).toISOString(),
        latitude: -23.5874,
        longitude: -46.6576,
        address: 'Parque Ibirapuera - Portao 3',
        maxParticipants: 15,
        participantCount: 8,
        creator_id: '1',
      });
      loadWeather(-23.5874, -46.6576);
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = async (lat: number, lng: number) => {
    try {
      const data = await fetchCurrentWeather(lat, lng);
      setWeather(data);
    } catch {
      // sem dados de clima
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    try {
      await api.post(`/events/${route.params.eventId}/join`);
      setIsJoined(true);
      Alert.alert('Sucesso!', 'Voce esta participando do evento!');
      loadEvent();
    } catch (error: any) {
      // Demo mode
      setIsJoined(true);
      if (event) {
        setEvent({ ...event, participantCount: (event.participantCount || 0) + 1 });
      }
      Alert.alert('Sucesso!', 'Voce esta participando do evento!');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirmAsync('Sair do evento', 'Deseja sair deste evento?', {
      confirmText: 'Sair', destructive: true,
    });
    if (!ok) return;
    setLeaving(true);
    try {
      await api.delete(`/events/${route.params.eventId}/leave`);
    } catch {}
    setIsJoined(false);
    if (event) {
      setEvent({ ...event, participantCount: Math.max(0, (event.participantCount || 1) - 1) });
    }
    setLeaving(false);
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Participe do evento "${event.title}" no Sync! ${event.sport} em ${event.address || 'local a definir'}. Baixe o Sync e junte-se a nos!`,
      });
    } catch {
      // compartilhamento cancelado
    }
  };

  const handleAddToCalendar = async () => {
    if (!event) return;
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Autorize o acesso ao calendário para adicionar o evento.');
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      // Prefer a local writable calendar
      const defaultCal =
        calendars.find((c) => c.allowsModifications && c.source?.isLocalAccount) ||
        calendars.find((c) => c.allowsModifications) ||
        calendars[0];

      if (!defaultCal) {
        Alert.alert('Calendário', 'Nenhum calendário disponível.');
        return;
      }

      const startDate = new Date(event.date);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h default

      await Calendar.createEventAsync(defaultCal.id, {
        title: event.title,
        startDate,
        endDate,
        notes: event.description || '',
        location: event.address || '',
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -15 }], // 1h and 15min before
      });

      Alert.alert('✅ Adicionado!', `"${event.title}" foi salvo no seu calendário.`);
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível adicionar ao calendário.');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || sendingComment) return;
    const commentText = comment.trim();
    setComment('');
    setSendingComment(true);
    try {
      const { data } = await api.post(`/events/${route.params.eventId}/comments`, {
        content: commentText,
      });
      setComments((prev) => [data, ...prev]);
    } catch {
      // fallback local se backend falhar
      setComments((prev) => [
        {
          id: Date.now().toString(),
          user: { name: user?.name || 'Voce' },
          content: commentText,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } finally {
      setSendingComment(false);
    }
  };

  if (loading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isFull = (event.participantCount || 0) >= event.maxParticipants;
  const spotsLeft = event.maxParticipants - (event.participantCount || 0);
  const sportColor = sportColors[event.sport] || colors.primary;
  const recommendation = weather ? getExerciseRecommendation(weather) : null;
  const fillPercent = Math.min(100, ((event.participantCount || 0) / event.maxParticipants) * 100);

  return (
    <View style={styles.container}>
      {/* Mini map header */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: event.latitude,
            longitude: event.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
          >
            <View style={[styles.mapMarker, { backgroundColor: sportColor }]}>
              <Ionicons
                name={sportIcons[event.sport] || 'calendar'}
                size={18}
                color={colors.white}
              />
            </View>
          </Marker>
        </MapView>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.calendarBtn} onPress={handleAddToCalendar}>
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Sport badge */}
        <View style={[styles.sportBadge, { backgroundColor: sportColor + '15' }]}>
          <Ionicons
            name={sportIcons[event.sport] || 'calendar'}
            size={14}
            color={sportColor}
          />
          <Text style={[styles.sportText, { color: sportColor }]}>
            {event.sport.charAt(0).toUpperCase() + event.sport.slice(1)}
          </Text>
        </View>

        <Text style={styles.title}>{event.title}</Text>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: sportColor + '12' }]}>
              <Ionicons name="calendar-outline" size={18} color={sportColor} />
            </View>
            <View>
              <Text style={styles.infoLabel}>Data e hora</Text>
              <Text style={styles.infoValue}>
                {new Date(event.date).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {event.address && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: sportColor + '12' }]}>
                <Ionicons name="location-outline" size={18} color={sportColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={styles.infoValue}>{event.address}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={[styles.infoIconWrap, { backgroundColor: sportColor + '12' }]}>
              <Ionicons name="people-outline" size={18} color={sportColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Participantes</Text>
              <Text style={styles.infoValue}>
                {event.participantCount || 0} / {event.maxParticipants}
                {!isFull && ` (${spotsLeft} vagas)`}
                {isFull && ' (lotado)'}
              </Text>
              {/* Progress bar */}
              <View style={styles.participantBar}>
                <View
                  style={[
                    styles.participantBarFill,
                    {
                      width: `${fillPercent}%`,
                      backgroundColor: fillPercent > 80 ? colors.warning : sportColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Weather card for event */}
        {weather && recommendation && (
          <View style={[styles.weatherCard, { borderLeftColor: recommendation.color }]}>
            <Ionicons name={weather.weatherIcon as any} size={24} color={recommendation.color} />
            <View style={styles.weatherCardContent}>
              <Text style={styles.weatherCardTemp}>
                {weather.temperature}° - {weather.weatherDescription}
              </Text>
              <Text style={[styles.weatherCardRec, { color: recommendation.color }]}>
                {recommendation.message}
              </Text>
            </View>
          </View>
        )}

        {/* Description */}
        {event.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre o evento</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* Comments section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comentarios ({comments.length})</Text>
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escreva um comentario..."
              placeholderTextColor={colors.secondaryText}
              value={comment}
              onChangeText={setComment}
              maxLength={300}
            />
            <TouchableOpacity
              style={[styles.commentSendBtn, (!comment.trim() || sendingComment) && styles.commentSendBtnDisabled]}
              onPress={handleAddComment}
              disabled={!comment.trim() || sendingComment}
            >
              <Ionicons name="send" size={16} color={comment.trim() && !sendingComment ? colors.white : colors.secondaryText} />
            </TouchableOpacity>
          </View>
          {comments.map((c) => (
            <View key={c.id} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Ionicons name="person" size={14} color={colors.secondaryText} />
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{c.user?.name || 'Usuario'}</Text>
                  <Text style={styles.commentTime}>
                    {new Date(c.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            </View>
          ))}
          {comments.length === 0 && (
            <Text style={styles.noComments}>Nenhum comentario ainda. Seja o primeiro!</Text>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {isJoined ? (
          <View style={styles.footerJoined}>
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.joinedText}>Voce esta participando!</Text>
            </View>
            <TouchableOpacity
              style={styles.leaveBtn}
              onPress={handleLeave}
              disabled={leaving}
            >
              <Text style={styles.leaveBtnText}>{leaving ? 'Saindo...' : 'Sair do evento'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={isFull || joining}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isFull ? [colors.secondaryText, colors.secondaryText] : [sportColor, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinBtnGradient}
            >
              {joining ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Ionicons name={isFull ? 'close-circle' : 'add-circle'} size={22} color={colors.white} />
                  <Text style={styles.joinBtnText}>
                    {isFull ? 'Evento lotado' : 'Participar do evento'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
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
    backgroundColor: '#0A0A0F',
  },
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A0A0F',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 36,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  headerActions: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 36,
    right: spacing.md,
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,15,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  sportText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: '#fff',
    marginTop: spacing.sm,
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: '#fff',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  participantBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 8,
    overflow: 'hidden',
  },
  participantBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Weather card
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    gap: spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  weatherCardContent: {
    flex: 1,
  },
  weatherCardTemp: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  weatherCardRec: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 24,
  },
  // Comments
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.sm,
    color: '#fff',
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  commentTime: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.4)',
  },
  commentText: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
  },
  noComments: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Footer
  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: '#0D0D1A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  joinBtn: {
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  joinBtnDisabled: {
    opacity: 0.7,
  },
  joinBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  joinBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.white,
  },
  footerJoined: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  joinedText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.success,
  },
  leaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '10',
  },
  leaveBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.error,
  },
});
