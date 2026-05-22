import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { colors, fontSize, spacing, borderRadius } from '../../theme';
import ScreenContainer from '../../components/layout/ScreenContainer';
import ProgressBar from '../../components/ui/ProgressBar';
import Button from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { getCurrentLocation, reverseGeocode } from '../../services/location.service';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Location'>;
};

// Cidades brasileiras pré-cadastradas para fallback manual
const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'São Paulo, SP', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro, RJ', lat: -22.9068, lng: -43.1729 },
  { name: 'Belo Horizonte, MG', lat: -19.9167, lng: -43.9345 },
  { name: 'Brasília, DF', lat: -15.7942, lng: -47.8822 },
  { name: 'Salvador, BA', lat: -12.9714, lng: -38.5014 },
  { name: 'Fortaleza, CE', lat: -3.7172, lng: -38.5433 },
  { name: 'Curitiba, PR', lat: -25.4284, lng: -49.2733 },
  { name: 'Porto Alegre, RS', lat: -30.0346, lng: -51.2177 },
  { name: 'Recife, PE', lat: -8.0476, lng: -34.8770 },
  { name: 'Manaus, AM', lat: -3.1190, lng: -60.0217 },
  { name: 'Florianópolis, SC', lat: -27.5954, lng: -48.5480 },
  { name: 'Goiânia, GO', lat: -16.6869, lng: -49.2648 },
];

export default function LocationScreen({ navigation }: Props) {
  const onboardingStore = useOnboardingStore();
  const { setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [city, setCity] = useState<string | undefined>();
  const [showManual, setShowManual] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getLocationByIP = async (): Promise<{ latitude: number; longitude: number; city?: string } | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude, city: data.city };
      }
    } catch {} finally { clearTimeout(timeout); }
    return null;
  };

  const requestLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await getCurrentLocation();
      let cityName: string | undefined;
      try {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        cityName = geo?.city;
      } catch {}
      onboardingStore.setLocation(coords.latitude, coords.longitude, cityName);
      setCity(cityName);
      setGranted(true);
    } catch (e: any) {
      // GPS falhou: tenta IP automaticamente
      const ip = await getLocationByIP();
      if (ip) {
        onboardingStore.setLocation(ip.latitude, ip.longitude, ip.city);
        setCity(ip.city);
        setGranted(true);
        setError(`Usando localização aproximada via internet${ip.city ? ` (${ip.city})` : ''}. Você pode liberar o GPS depois nas configurações.`);
      } else {
        setError('Não conseguimos detectar sua localização. Escolha sua cidade abaixo.');
        setShowManual(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const pickCity = (c: { name: string; lat: number; lng: number }) => {
    onboardingStore.setLocation(c.lat, c.lng, c.name);
    setCity(c.name);
    setGranted(true);
    setShowManual(false);
    setError(null);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const data = onboardingStore.getData();
      const { data: updatedUser } = await api.post('/users/onboarding', data);
      setUser(updatedUser);
      onboardingStore.reset();
    } catch (err: any) {
      const isNet = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED';
      const isAuth = err.response?.status === 401;
      if (isNet || isAuth) {
        const data = onboardingStore.getData();
        const updatedUser = { ...user, ...data, onboardingCompleted: true };
        await AsyncStorage.setItem('@sync:user', JSON.stringify(updatedUser));
        setUser(updatedUser as any);
        onboardingStore.reset();
      } else {
        setError(err.response?.data?.message || 'Erro ao salvar perfil');
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = CITIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <ProgressBar current={5} total={5} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Sua localização</Text>
        <Text style={styles.subtitle}>
          Pra encontrar pessoas e eventos perto de você
        </Text>

        <View style={[styles.card, granted && styles.cardOk]}>
          <Ionicons
            name={granted ? 'checkmark-circle' : 'location'}
            size={56}
            color={granted ? colors.success : colors.primary}
          />
          <Text style={styles.cardText}>
            {granted
              ? city
                ? `📍 ${city}`
                : 'Localização configurada!'
              : 'Toque pra detectar automaticamente'}
          </Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        {!granted && !showManual && (
          <>
            <Button
              title={loading ? 'Detectando...' : 'Usar minha localização'}
              variant="outline"
              onPress={requestLocation}
              loading={loading}
            />
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => setShowManual(true)}
              disabled={loading}
            >
              <Text style={styles.linkText}>Escolher cidade manualmente</Text>
            </TouchableOpacity>
          </>
        )}

        {showManual && !granted && (
          <View style={styles.manualWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar cidade..."
              placeholderTextColor={colors.secondaryText}
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.cityList}>
              {filtered.slice(0, 8).map((c) => (
                <TouchableOpacity
                  key={c.name}
                  style={styles.cityRow}
                  onPress={() => pickCity(c)}
                >
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.cityName}>{c.name}</Text>
                </TouchableOpacity>
              ))}
              {filtered.length === 0 && (
                <Text style={styles.emptyText}>Nenhuma cidade encontrada</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => { setShowManual(false); setError(null); }}
            >
              <Text style={styles.linkText}>← Tentar GPS novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {granted && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => { setGranted(false); setCity(undefined); setShowManual(false); }}
          >
            <Text style={styles.linkText}>Trocar localização</Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        title="Finalizar"
        onPress={handleFinish}
        disabled={!granted}
        loading={loading}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  content: { flex: 1, marginTop: spacing.xl },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  card: {
    minHeight: 180,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardOk: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  cardText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.secondaryText,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  manualWrap: { marginTop: spacing.sm },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: fontSize.md,
  },
  cityList: { marginTop: spacing.sm },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  cityName: { color: colors.text, fontSize: fontSize.md },
  emptyText: {
    color: colors.secondaryText,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  linkText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  button: { marginBottom: spacing.lg },
});
