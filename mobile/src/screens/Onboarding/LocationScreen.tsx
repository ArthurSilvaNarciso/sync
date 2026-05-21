import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
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
import { Platform } from 'react-native';
import { getCurrentLocation } from '../../services/location.service';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Location'>;
};

export default function LocationScreen({ navigation }: Props) {
  const onboardingStore = useOnboardingStore();
  const { setUser, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [cityName, setCityName] = useState<string | undefined>();

  const getLocationByIP = async (): Promise<{ latitude: number; longitude: number; city?: string } | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return { latitude: data.latitude, longitude: data.longitude, city: data.city };
      }
    } catch {} finally {
      clearTimeout(timeout);
    }
    return null;
  };

  const requestLocation = async () => {
    setLoading(true);
    let usedFallback = false;
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      let city: string | undefined;

      if (Platform.OS === 'web') {
        // Web: tenta a Geolocation API do browser primeiro
        const browserResult = await new Promise<{ latitude: number; longitude: number; denied?: boolean } | null>((resolve) => {
          if (!navigator?.geolocation) { resolve(null); return; }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            (err) => resolve(err.code === err.PERMISSION_DENIED ? { latitude: 0, longitude: 0, denied: true } : null),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
          );
        });

        if (browserResult && !browserResult.denied) {
          coords = { latitude: browserResult.latitude, longitude: browserResult.longitude };
        } else {
          if (browserResult?.denied) {
            Alert.alert(
              'Permissão de localização negada',
              'Vamos usar uma localização aproximada via internet. Você pode liberar a permissão depois nas configurações do navegador.',
            );
          }
          // Fallback: aproximação por IP
          const ipResult = await getLocationByIP();
          if (ipResult) {
            coords = ipResult;
            city = ipResult.city;
            usedFallback = true;
          }
        }
      } else {
        // Native: use expo-location
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissao negada', 'Ative a permissao de localizacao nas configuracoes.');
          return;
        }
        try {
          const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        } catch {
          const last = await ExpoLocation.getLastKnownPositionAsync({ maxAge: 300000 }).catch(() => null);
          if (last) coords = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        }
        // Reverse geocode city on native
        if (coords) {
          try {
            const [geo] = await ExpoLocation.reverseGeocodeAsync(coords);
            city = geo?.city || geo?.subregion || geo?.region || undefined;
          } catch {}
        }
      }

      if (!coords) {
        // Não usar fallback fake — pede pro user liberar GPS
        Alert.alert(
          'Localização necessária',
          'Não conseguimos sua localização. Libere o GPS nas configurações e tente novamente, ou toque em "Pular" pra definir depois no perfil.',
        );
        return;
      } else if (usedFallback) {
        Alert.alert(
          'Localização aproximada',
          `Detectamos ${city || 'sua região'} pela sua conexão. Para resultados mais precisos, libere a permissão de localização.`,
        );
      }

      onboardingStore.setLocation(coords.latitude, coords.longitude, city);
      setCityName(city);
      setLocationGranted(true);
    } catch {
      Alert.alert(
        'Erro ao obter localização',
        'Não foi possível pegar seu GPS agora. Verifique as permissões e tente novamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const data = onboardingStore.getData();
      const { data: updatedUser } = await api.post('/users/onboarding', data);
      setUser(updatedUser);
      onboardingStore.reset();
    } catch (error: any) {
      // Backend unavailable or demo token — complete onboarding locally
      const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
      const isAuthError = error.response?.status === 401;
      if (isNetworkError || isAuthError) {
        const data = onboardingStore.getData();
        const updatedUser = { ...user, ...data, onboardingCompleted: true };
        await AsyncStorage.setItem('@sync:user', JSON.stringify(updatedUser));
        setUser(updatedUser as any);
        onboardingStore.reset();
      } else {
        Alert.alert('Erro', error.response?.data?.message || 'Erro ao salvar perfil');
      }
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.title}>Sua localizacao</Text>
        <Text style={styles.subtitle}>
          Usamos para encontrar pessoas e eventos proximos a voce
        </Text>

        <View style={styles.mapPlaceholder}>
          <Ionicons
            name={locationGranted ? 'checkmark-circle' : 'location'}
            size={64}
            color={locationGranted ? colors.success : colors.primary}
          />
          <Text style={styles.mapText}>
            {locationGranted
              ? cityName
                ? `Localizacao obtida: ${cityName}`
                : 'Localizacao obtida com sucesso!'
              : 'Toque abaixo para ativar'}
          </Text>
        </View>

        {!locationGranted && (
          <>
            <Button
              title={loading ? 'Obtendo localizacao...' : 'Usar minha localizacao'}
              variant="outline"
              onPress={requestLocation}
              loading={loading}
            />
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => {
                // Pula sem setar coordenada — usuário define depois no perfil.
                // Discovery/Events mostrarão CTA "Ativar localização".
                setLocationGranted(true);
              }}
              disabled={loading}
            >
              <Text style={styles.skipText}>Pular por agora</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Button
        title="Finalizar"
        onPress={handleFinish}
        disabled={!locationGranted}
        loading={loading}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  content: {
    flex: 1,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapText: {
    fontSize: fontSize.md,
    color: colors.secondaryText,
    marginTop: spacing.md,
  },
  button: {
    marginBottom: spacing.lg,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.secondaryText,
    textDecorationLine: 'underline',
  },
});
