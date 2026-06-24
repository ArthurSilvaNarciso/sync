import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { View, Text, TouchableOpacity } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import LiveViewScreen from './src/screens/Live/LiveViewScreen';
import ToastHost from './src/components/ui/Toast';
import AccessibilityEffects from './src/components/AccessibilityEffects';
import ConnectionBanner from './src/components/ConnectionBanner';
import ErrorBoundary from './src/components/ErrorBoundary';

// Fallback global: se QUALQUER tela quebrar no render, mostra isto em vez de
// uma tela branca. No web dá pra recarregar; no nativo o botão tenta reabrir.
function GlobalCrashFallback() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 12 }}>🛠️</Text>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center' }}>
        Algo deu errado por aqui
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
        Tivemos um problema ao exibir esta parte do app. Tente recarregar.
      </Text>
      <TouchableOpacity
        onPress={() => { if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload(); }}
        style={{ marginTop: 24, backgroundColor: '#FF6B35', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14 }}
        accessibilityRole="button"
        accessibilityLabel="Recarregar o app"
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Recarregar</Text>
      </TouchableOpacity>
    </View>
  );
}

// PWA: registra service worker no web
function registerServiceWorker() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('[Sync] Service Worker registrado'))
        .catch((err) => console.warn('[Sync] SW failed:', err));
    });
  }
}

// Detecta rota pública /live/:token no web e renderiza só a tela de live
function getLiveToken(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const m = window.location.pathname.match(/^\/live\/([a-z0-9]+)\/?$/i);
  return m?.[1] || null;
}

export default function App() {
  const liveToken = getLiveToken();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  if (liveToken) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <LiveViewScreen token={liveToken} />
      </GestureHandlerRootView>
    );
  }

  // No web, centraliza o app numa coluna estilo celular (maxWidth) pra não
  // esticar de ponta a ponta no desktop. No nativo, ocupa a tela toda.
  const isWeb = Platform.OS === 'web';

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
      <View
        style={
          isWeb
            ? { flex: 1, alignItems: 'center', backgroundColor: '#000' }
            : { flex: 1 }
        }
      >
        <View
          style={
            isWeb
              ? { flex: 1, width: '100%', maxWidth: 480, backgroundColor: '#0A0A0F', overflow: 'hidden' }
              : { flex: 1 }
          }
        >
          <NavigationContainer>
            <StatusBar style="auto" />
            <AccessibilityEffects />
            <ConnectionBanner />
            <ErrorBoundary fallback={<GlobalCrashFallback />}>
              <RootNavigator />
            </ErrorBoundary>
            <ToastHost />
          </NavigationContainer>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
