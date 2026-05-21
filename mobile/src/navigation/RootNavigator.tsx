import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { getCurrentLocation } from '../services/location.service';
import api from '../services/api';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, user, isLoading, loadStoredAuth, setUser } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Sincroniza GPS real com backend assim que o user loga.
  // Garante que Discovery, Events e Ranking usem a localização atual.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    (async () => {
      try {
        const coords = await getCurrentLocation();
        await api.put('/users/location', {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        // Atualiza store local pra refletir lat/lng novos
        setUser({ ...user, latitude: coords.latitude, longitude: coords.longitude } as any);
      } catch {
        // silencioso — telas individuais mostram UX de erro
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return null; // Splash screen handled by expo-splash-screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !user?.onboardingCompleted ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}
