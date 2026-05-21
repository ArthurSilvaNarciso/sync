import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import LiveViewScreen from './src/screens/Live/LiveViewScreen';
import ToastHost from './src/components/ui/Toast';

// Detecta rota pública /live/:token no web e renderiza só a tela de live
function getLiveToken(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/live\/([a-z0-9]+)\/?$/i);
  return m?.[1] || null;
}

export default function App() {
  const liveToken = getLiveToken();

  if (liveToken) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <LiveViewScreen token={liveToken} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
        <ToastHost />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
