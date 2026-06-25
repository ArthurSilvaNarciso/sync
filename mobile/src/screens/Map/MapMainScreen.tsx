import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Circle, HeatLayer, Polyline } from '../../components/map/SyncMap';
import { planRoute, RouteResult } from '../../services/routing.service';
import RoutePlannerPanel from '../../components/map/RoutePlannerPanel';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapStackParamList } from '../../navigation/types';
import { Event as EventType } from '../../types';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getCurrentLocation } from '../../services/location.service';
import { fetchCurrentWeather, WeatherData, getExerciseRecommendation, reverseGeocode } from '../../services/external-apis';
import api from '../../services/api';
import { confirmAsync } from '../../utils/confirm';
import { showToast } from '../../components/ui/Toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<MapStackParamList, 'MapMain'>;
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
  crossfit: 'fitness',
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
  crossfit: '#E91E63',
};

export default function MapMainScreen({ navigation }: Props) {
  const [events, setEvents] = useState<EventType[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [joining, setJoining] = useState(false);
  const [region, setRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [locationName, setLocationName] = useState('');
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [searchRadius, setSearchRadius] = useState(20);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<Array<[number, number]>>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);
  // Route planner state
  const [routeMode, setRouteMode] = useState(false);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number } | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Carrega heatmap quando ativado e há localização
  useEffect(() => {
    if (!showHeatmap || !userCoords) return;
    api
      .get('/activities/heatmap/nearby', {
        params: { lat: userCoords.latitude, lng: userCoords.longitude, radiusKm: 10 },
      })
      .then((res) => setHeatmapPoints(res.data?.points || []))
      .catch(() => setHeatmapPoints([]));
  }, [showHeatmap, userCoords]);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const weatherAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initLocation();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(cardAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedEvent]);

  useEffect(() => {
    Animated.timing(weatherAnim, {
      toValue: showWeatherPanel ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showWeatherPanel]);

  const initLocation = async () => {
    setLocationError(null);
    setLoading(true);
    try {
      const coords = await getCurrentLocation();
      setUserCoords(coords);
      const newRegion = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setRegion(newRegion);
      loadEvents(coords.latitude, coords.longitude);
      loadWeather(coords.latitude, coords.longitude);
      loadLocationName(coords.latitude, coords.longitude);
      // Sincroniza lat/lng REAL com o backend (pra Discovery/Eventos usarem)
      api.put('/users/location', {
        latitude: coords.latitude,
        longitude: coords.longitude,
      }).catch(() => {});
    } catch (error: any) {
      console.log('Location error:', error?.message || error);
      setLocationError(error?.message || 'Não foi possível obter sua localização.');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (lat: number, lng: number) => {
    try {
      const params: any = { latitude: lat, longitude: lng, radiusKm: searchRadius };
      if (filter) params.sport = filter;
      const { data } = await api.get('/events/nearby', { params });
      setEvents(data);
    } catch (error) {
      console.log('Error loading events:', error);
      // Mock events for demo
      setEvents([
        {
          id: '1', title: 'Corrida matinal no Ibirapuera', sport: 'running',
          date: new Date(Date.now() + 86400000).toISOString(),
          latitude: lat + 0.005, longitude: lng + 0.003,
          address: 'Parque Ibirapuera', maxParticipants: 15, participantCount: 8,
          creator_id: '1',
        },
        {
          id: '2', title: 'Pedal urbano SP', sport: 'cycling',
          date: new Date(Date.now() + 172800000).toISOString(),
          latitude: lat - 0.008, longitude: lng + 0.006,
          address: 'Av. Paulista', maxParticipants: 20, participantCount: 12,
          creator_id: '2',
        },
        {
          id: '3', title: 'Futebol society', sport: 'football',
          date: new Date(Date.now() + 43200000).toISOString(),
          latitude: lat + 0.01, longitude: lng - 0.005,
          address: 'Arena Society', maxParticipants: 14, participantCount: 10,
          creator_id: '3',
        },
        {
          id: '4', title: 'Yoga ao ar livre', sport: 'yoga',
          date: new Date(Date.now() + 259200000).toISOString(),
          latitude: lat - 0.003, longitude: lng - 0.008,
          address: 'Praca da Republica', maxParticipants: 12, participantCount: 5,
          creator_id: '4',
        },
        {
          id: '5', title: 'Basquete 3x3', sport: 'basketball',
          date: new Date(Date.now() + 345600000).toISOString(),
          latitude: lat + 0.007, longitude: lng + 0.009,
          address: 'Quadra SESC', maxParticipants: 6, participantCount: 4,
          creator_id: '5',
        },
      ]);
    }
  };

  const loadWeather = async (lat: number, lng: number) => {
    try {
      const data = await fetchCurrentWeather(lat, lng);
      setWeather(data);
    } catch (error) {
      console.log('Weather error:', error);
    }
  };

  const loadLocationName = async (lat: number, lng: number) => {
    try {
      const geo = await reverseGeocode(lat, lng);
      setLocationName(geo.neighborhood ? `${geo.neighborhood}, ${geo.city}` : geo.city);
    } catch (error) {
      setLocationName('');
    }
  };

  const centerOnUser = async () => {
    try {
      const coords = await getCurrentLocation();
      setUserCoords(coords);
      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 500);
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const handleFilterPress = (sportId: string | null) => {
    setFilter(sportId);
    if (userCoords) {
      loadEvents(userCoords.latitude, userCoords.longitude);
    }
  };

  const filteredEvents = filter
    ? events.filter((e) => e.sport === filter)
    : events;

  const filters = [
    { id: null, label: 'Todos', icon: 'apps-outline' as const },
    { id: 'running', label: 'Corrida', icon: 'walk-outline' as const },
    { id: 'cycling', label: 'Ciclismo', icon: 'bicycle-outline' as const },
    { id: 'football', label: 'Futebol', icon: 'football-outline' as const },
    { id: 'basketball', label: 'Basquete', icon: 'basketball-outline' as const },
    { id: 'swimming', label: 'Natacao', icon: 'water-outline' as const },
    { id: 'yoga', label: 'Yoga', icon: 'body-outline' as const },
    { id: 'gym', label: 'Academia', icon: 'barbell-outline' as const },
  ];

  const recommendation = weather ? getExerciseRecommendation(weather) : null;

  // Sem localização real ainda: mostra estado de empty/erro centralizado
  if (!region) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }]}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={{ color: colors.text, marginTop: spacing.md, fontSize: fontSize.md, fontWeight: '600' }}>
              Procurando sua localização...
            </Text>
            <Text style={{ color: colors.secondaryText, marginTop: 4, fontSize: fontSize.xs, textAlign: 'center' }}>
              Permita o acesso ao GPS pra ver eventos perto de você.
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="location-outline" size={56} color="#FF6B35" />
            <Text style={{ color: colors.text, marginTop: spacing.md, fontSize: fontSize.md, fontWeight: '700', textAlign: 'center' }}>
              {locationError || 'Sem acesso à sua localização'}
            </Text>
            <Text style={{ color: colors.secondaryText, marginTop: spacing.xs, fontSize: fontSize.xs, textAlign: 'center', maxWidth: 320 }}>
              {Platform.OS === 'web'
                ? 'Clique no cadeado da barra de endereço e libere "Localização".'
                : 'Vá em Ajustes do dispositivo → Sync → Localização e ative.'}
            </Text>
            <TouchableOpacity
              style={{ marginTop: spacing.lg, backgroundColor: '#FF6B35', paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={initLocation}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={18} color={colors.white} />
              <Text style={{ color: colors.white, fontWeight: '700' }}>Tentar novamente</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={async (e: any) => {
          setSelectedEvent(null);
          setShowWeatherPanel(false);
          // Modo planejador: usa coordenadas do clique
          if (routeMode && userCoords) {
            const coord =
              e?.nativeEvent?.coordinate || // RN-Maps native
              e?.latlng ||                  // Leaflet web
              null;
            const lat = coord?.latitude ?? coord?.lat;
            const lng = coord?.longitude ?? coord?.lng;
            if (lat == null || lng == null) return;
            const dest = { latitude: lat, longitude: lng };
            setDestination(dest);
            setRouteLoading(true);
            const result = await planRoute(userCoords, dest, 'foot');
            setRoute(result);
            setRouteLoading(false);
          }
        }}
      >
        {/* Heatmap overlay — rotas populares */}
        {showHeatmap && heatmapPoints.length > 0 && (
          <HeatLayer points={heatmapPoints} intensity={0.18} radiusM={50} />
        )}

        {/* Search radius circle */}
        {userCoords && (
          <Circle
            center={userCoords}
            radius={searchRadius * 1000}
            strokeColor={colors.primary + '30'}
            fillColor={colors.primary + '08'}
            strokeWidth={1}
          />
        )}

        {filteredEvents.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            onPress={() => {
              setSelectedEvent(event);
              setShowWeatherPanel(false);
            }}
          >
            <View style={[styles.marker, { backgroundColor: sportColors[event.sport] || colors.primary }]}>
              <Ionicons
                name={sportIcons[event.sport] || 'calendar'}
                size={16}
                color={colors.white}
              />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: sportColors[event.sport] || colors.primary }]} />
          </Marker>
        ))}

        {/* Route planner: linha da rota planejada */}
        {route?.coordinates && route.coordinates.length > 1 && (
          <Polyline
            coordinates={route.coordinates}
            strokeColor="#FF6B35"
            strokeWidth={5}
          />
        )}

        {/* Marker do destino */}
        {destination && (
          <Marker coordinate={destination}>
            <View style={[styles.marker, { backgroundColor: '#FF6B35' }]}>
              <Ionicons name="flag" size={14} color="#fff" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Route mode toggle (canto direito) */}
      <TouchableOpacity
        style={[styles.routeBtn, routeMode && styles.routeBtnActive]}
        onPress={() => {
          const next = !routeMode;
          setRouteMode(next);
          if (!next) {
            setDestination(null);
            setRoute(null);
          }
        }}
      >
        <Ionicons
          name={routeMode ? 'close' : 'navigate'}
          size={20}
          color={routeMode ? '#fff' : '#FF6B35'}
        />
      </TouchableOpacity>

      {/* Painel inferior do planejador */}
      {routeMode && (
        <View style={styles.routePanelWrap}>
          <RoutePlannerPanel
            route={route}
            loading={routeLoading}
            onClear={() => { setDestination(null); setRoute(null); }}
            onStart={(sport) => {
              // Volta pra TrackingMain pra iniciar atividade com sport selecionado
              setRouteMode(false);
              setDestination(null);
              setRoute(null);
              navigation.getParent()?.navigate('TrackingTab' as never);
            }}
          />
        </View>
      )}

      {/* Top bar — faixa rolável pra não sobrepor os chips no celular */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.topBar}
        contentContainerStyle={styles.topBarContent}
      >
        {/* Location name */}
        {locationName ? (
          <View style={styles.locationChip}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{locationName}</Text>
          </View>
        ) : null}

        {/* Weather chip */}
        {weather && (
          <TouchableOpacity
            style={styles.weatherChip}
            onPress={() => setShowWeatherPanel(!showWeatherPanel)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={weather.weatherIcon as any}
              size={18}
              color={recommendation?.color || colors.primary}
            />
            <Text style={styles.weatherTemp}>{weather.temperature}°</Text>
            {recommendation && (
              <View style={[styles.weatherDot, { backgroundColor: recommendation.color }]} />
            )}
          </TouchableOpacity>
        )}

        {/* Heatmap toggle */}
        <TouchableOpacity
          style={[styles.locationChip, showHeatmap && { backgroundColor: '#FF6B35', borderColor: '#FF6B35' }]}
          onPress={() => setShowHeatmap((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons name="flame" size={14} color={showHeatmap ? '#fff' : '#FF6B35'} />
          <Text style={[styles.locationText, showHeatmap && { color: '#fff' }]}>
            Heatmap{showHeatmap && heatmapPoints.length ? ` (${heatmapPoints.length})` : ''}
          </Text>
        </TouchableOpacity>

        {/* Territórios — jogo de conquista */}
        <TouchableOpacity
          style={[styles.locationChip, { borderColor: '#FCD34D' }]}
          onPress={() => navigation.navigate('Territory')}
          activeOpacity={0.7}
        >
          <Ionicons name="flag" size={14} color="#FCD34D" />
          <Text style={[styles.locationText, { color: '#FCD34D' }]}>Territórios</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Filter row */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.label}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => handleFilterPress(f.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={f.icon}
                size={16}
                color={filter === f.id ? colors.white : colors.text}
              />
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Weather panel */}
      {weather && recommendation && (
        <Animated.View
          style={[
            styles.weatherPanel,
            {
              opacity: weatherAnim,
              transform: [{
                translateY: weatherAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
          ]}
          pointerEvents={showWeatherPanel ? 'auto' : 'none'}
        >
          <LinearGradient
            colors={['rgba(10,10,20,0.98)', 'rgba(14,14,28,0.99)']}
            style={styles.weatherPanelInner}
          >
            <View style={styles.weatherHeader}>
              <View style={styles.weatherMainInfo}>
                <Ionicons name={weather.weatherIcon as any} size={36} color={recommendation.color} />
                <View style={styles.weatherTempBlock}>
                  <Text style={styles.weatherTempLarge}>{weather.temperature}°C</Text>
                  <Text style={styles.weatherDesc}>{weather.weatherDescription}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowWeatherPanel(false)}>
                <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>

            <View style={styles.weatherDetails}>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="water-outline" size={16} color={colors.secondaryText} />
                <Text style={styles.weatherDetailText}>{weather.humidity}%</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="speedometer-outline" size={16} color={colors.secondaryText} />
                <Text style={styles.weatherDetailText}>{weather.windSpeed} km/h</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="sunny-outline" size={16} color={colors.secondaryText} />
                <Text style={styles.weatherDetailText}>UV {weather.uvIndex}</Text>
              </View>
              <View style={styles.weatherDetailItem}>
                <Ionicons name="thermometer-outline" size={16} color={colors.secondaryText} />
                <Text style={styles.weatherDetailText}>Sens. {weather.feelsLike}°</Text>
              </View>
            </View>

            {/* Exercise recommendation */}
            <View style={[styles.recommendationBanner, { backgroundColor: recommendation.color + '15' }]}>
              <View style={[styles.recommendationDot, { backgroundColor: recommendation.color }]} />
              <View style={styles.recommendationContent}>
                <Text style={[styles.recommendationLevel, { color: recommendation.color }]}>
                  {recommendation.level.charAt(0).toUpperCase() + recommendation.level.slice(1)} para exercicios
                </Text>
                <Text style={styles.recommendationMessage}>{recommendation.message}</Text>
              </View>
              <Text style={[styles.recommendationScore, { color: recommendation.color }]}>
                {recommendation.score}
              </Text>
            </View>

            {recommendation.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                {recommendation.tips.slice(0, 2).map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Ionicons name="bulb-outline" size={14} color={colors.warning} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </LinearGradient>
        </Animated.View>
      )}

      {/* Controles de fundo — escondidos quando um evento está aberto, pra
          não ficar tudo empilhado em cima do card. */}
      {!selectedEvent && (<>
      {/* Map controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.mapBtn} onPress={centerOnUser}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => {
            const newRadius = searchRadius === 5 ? 10 : searchRadius === 10 ? 20 : searchRadius === 20 ? 50 : 5;
            setSearchRadius(newRadius);
            if (userCoords) loadEvents(userCoords.latitude, userCoords.longitude);
          }}
        >
          <Text style={styles.radiusText}>{searchRadius}</Text>
          <Text style={styles.radiusUnit}>km</Text>
        </TouchableOpacity>
      </View>

      {/* Events count badge */}
      <View style={styles.eventCountBadge}>
        <Ionicons name="calendar" size={14} color={colors.primary} />
        <Text style={styles.eventCountText}>
          {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} proximo{filteredEvents.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* My events button */}
      <TouchableOpacity
        style={styles.myEventsBtn}
        onPress={() => navigation.navigate('MyEvents')}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.text} />
        <Text style={styles.myEventsBtnText}>Meus eventos</Text>
      </TouchableOpacity>

      {/* Flash event FAB (⚡ killer feature) */}
      <TouchableOpacity
        style={styles.flashBtn}
        onPress={async () => {
          if (!userCoords) {
            showToast('Aguarde sua localização carregar.', 'info');
            return;
          }
          // confirmação rápida: usa o filtro de esporte atual ou 'running' como default
          const sport = filter || 'running';
          // confirmAsync funciona no web (Alert.alert ignora os botões lá)
          const ok = await confirmAsync(
            '⚡ Evento relâmpago',
            `Criar ${sport} começando em 15min e notificar atletas em 5km?`,
            { confirmText: 'Criar' },
          );
          if (!ok) return;
          try {
            const { data } = await api.post('/events/flash', {
              sport,
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
              address: locationName || undefined,
              startsInMinutes: 15,
              radiusKm: 5,
            });
            showToast(`⚡ Criado! ${data.notifiedCount} atletas notificados.`, 'success');
            loadEvents(userCoords.latitude, userCoords.longitude);
          } catch (e: any) {
            showToast(e.response?.data?.message || 'Falha ao criar relâmpago', 'error');
          }
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF6B35', '#FF5021']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.flashBtnGradient}
        >
          <Ionicons name="flash" size={22} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create event FAB */}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[...colors.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.createBtnGradient}
        >
          <Ionicons name="add" size={28} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
      </>)}

      {/* Event card */}
      {selectedEvent && (
        <Animated.View
          style={[
            styles.eventCard,
            {
              transform: [{
                translateY: cardAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [200, 0],
                }),
              }],
              opacity: cardAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeCard}
            onPress={() => setSelectedEvent(null)}
          >
            <Ionicons name="close-circle" size={24} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={styles.eventCardHeader}>
            <View style={[styles.eventSportBadge, { backgroundColor: (sportColors[selectedEvent.sport] || colors.primary) + '15' }]}>
              <Ionicons
                name={sportIcons[selectedEvent.sport] || 'calendar'}
                size={20}
                color={sportColors[selectedEvent.sport] || colors.primary}
              />
            </View>
            <View style={styles.eventCardInfo}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {selectedEvent.title}
              </Text>
              <Text style={[styles.eventSport, { color: sportColors[selectedEvent.sport] || colors.primary }]}>
                {selectedEvent.sport.charAt(0).toUpperCase() + selectedEvent.sport.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.eventDetailRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.secondaryText} />
              <Text style={styles.eventDetailText}>
                {new Date(selectedEvent.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {selectedEvent.address && (
              <View style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={16} color={colors.secondaryText} />
                <Text style={styles.eventDetailText} numberOfLines={1}>
                  {selectedEvent.address}
                </Text>
              </View>
            )}
            <View style={styles.eventDetailRow}>
              <Ionicons name="people-outline" size={16} color={colors.secondaryText} />
              <Text style={styles.eventDetailText}>
                {selectedEvent.participantCount || 0}/{selectedEvent.maxParticipants} participantes
              </Text>
              {/* Progress bar */}
              <View style={styles.participantBar}>
                <View
                  style={[
                    styles.participantBarFill,
                    {
                      width: `${Math.min(100, ((selectedEvent.participantCount || 0) / selectedEvent.maxParticipants) * 100)}%`,
                      backgroundColor: ((selectedEvent.participantCount || 0) / selectedEvent.maxParticipants) > 0.8 ? colors.warning : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Linha 1: Participar (primário, faz o join direto) */}
          <TouchableOpacity
            style={styles.joinBtn}
            disabled={joining || (selectedEvent.participantCount || 0) >= selectedEvent.maxParticipants}
            onPress={async () => {
              const evt = selectedEvent;
              if (!evt) return;
              setJoining(true);
              try {
                await api.post(`/events/${evt.id}/join`);
                showToast(`Você entrou em "${evt.title}"! 🎉`, 'success');
                // Atualiza a contagem localmente e recarrega os eventos
                setSelectedEvent({ ...evt, participantCount: (evt.participantCount || 0) + 1 });
                if (userCoords) loadEvents(userCoords.latitude, userCoords.longitude);
              } catch (e: any) {
                showToast(e?.response?.data?.message || 'Não foi possível participar agora.', 'error');
              } finally {
                setJoining(false);
              }
            }}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[sportColors[selectedEvent.sport] || colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.joinBtnGradient}
            >
              {joining ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (selectedEvent.participantCount || 0) >= selectedEvent.maxParticipants ? (
                <Text style={styles.joinBtnText}>Evento lotado</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                  <Text style={styles.joinBtnText}>Participar</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Linha 2: Ver detalhes (secundário) + compartilhar */}
          <View style={styles.eventCardActions}>
            <TouchableOpacity
              style={styles.detailLinkBtn}
              onPress={() => {
                const evt = selectedEvent;
                setSelectedEvent(null);
                navigation.navigate('EventDetail', { eventId: evt.id });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.detailLinkText}>Ver detalhes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareEventBtn}
              onPress={async () => {
                const { Share } = require('react-native');
                await Share.share({
                  message: `Participe de "${selectedEvent.title}" no Sync!`,
                });
              }}
            >
              <Ionicons name="share-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando mapa...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 40,
    left: 0,
    right: 0,
    // Altura fixa: ScrollView absoluto sem altura captura toque sobre o mapa todo
    maxHeight: 44,
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  locationText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  routeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 90,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(10,10,15,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  routeBtnActive: { backgroundColor: '#FF6B35' },
  routePanelWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 90 : 80,
  },
  weatherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  weatherTemp: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  weatherDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 98 : 84,
    left: 0,
    right: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  filterTextActive: {
    color: colors.white,
  },
  // Weather panel
  weatherPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 140 : 126,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  weatherPanelInner: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  weatherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  weatherMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  weatherTempBlock: {},
  weatherTempLarge: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  weatherDesc: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    marginTop: -2,
    textTransform: 'capitalize',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  weatherDetailItem: {
    alignItems: 'center',
    gap: 4,
  },
  weatherDetailText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  recommendationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationLevel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  recommendationMessage: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: 1,
  },
  recommendationScore: {
    fontSize: 24,
    fontWeight: '800',
    marginLeft: spacing.sm,
  },
  tipsContainer: {
    marginTop: spacing.sm,
    gap: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipText: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    flex: 1,
  },
  // Map controls
  mapControls: {
    position: 'absolute',
    right: spacing.md,
    // Topo da coluna direita: createBtn(140,56) → flashBtn(208,48) → mapControls
    bottom: 268,
    gap: spacing.sm,
  },
  mapBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  radiusText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: -2,
  },
  radiusUnit: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.secondaryText,
    marginTop: -3,
  },
  eventCountBadge: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 85,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  eventCountText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  // Markers
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.dark.background,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
    alignSelf: 'center',
    marginTop: -2,
  },
  myEventsBtn: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 85,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  myEventsBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text,
  },
  createBtn: {
    position: 'absolute',
    bottom: 140,
    right: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  createBtnGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashBtn: {
    position: 'absolute',
    bottom: 208,
    right: spacing.md,
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  flashBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCard: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 85,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(10,10,15,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  closeCard: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  eventSportBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  eventTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  eventSport: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
  eventDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eventDetailText: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    flex: 1,
  },
  participantBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  participantBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  joinBtn: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  joinBtnGradient: {
    flexDirection: 'row',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
  },
  joinBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.md,
  },
  eventCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  detailLinkText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fontSize.sm,
  },
  shareEventBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBtn: {
    flex: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  detailBtnGradient: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  detailBtnText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,15,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
  },
});
