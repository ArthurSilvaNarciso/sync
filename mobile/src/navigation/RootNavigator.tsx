import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuthStore } from '../store/authStore';
import { getCurrentLocation } from '../services/location.service';
import { registerForPushNotifications } from '../services/push-notifications.service';
import api from '../services/api';

import AuthNavigator from './AuthNavigator';
import OnboardingNavigator from './OnboardingNavigator';
import MainTabNavigator from './MainTabNavigator';
import NetworkBanner from '../components/NetworkBanner';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { isAuthenticated, user, isLoading, loadStoredAuth, setUser } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Sincroniza GPS real + registra push token quando user loga
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    (async () => {
      try {
        const coords = await getCurrentLocation();
        await api.put('/users/location', {
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setUser({ ...user, latitude: coords.latitude, longitude: coords.longitude } as any);
      } catch {
        // silencioso
      }
      // Push notifications — pede permissão e registra token
      try {
        await registerForPushNotifications();
      } catch {
        // silencioso
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  if (isLoading) {
    return null; // Splash screen handled by expo-splash-screen
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !user?.onboardingCompleted ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
      <NetworkBanner />
    </View>
  );
}
